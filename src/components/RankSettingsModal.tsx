'use client';

import { useState, useEffect } from 'react';
import type { RankThreshold } from '@/lib/types';

interface RankSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RankSettingsModal({ isOpen, onClose }: RankSettingsModalProps) {
  const [thresholds, setThresholds] = useState<RankThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/settings/ranks');
      const data = await res.json();
      if (data.thresholds) {
        setThresholds(data.thresholds.sort((a: RankThreshold, b: RankThreshold) => b.score - a.score));
      }
    } catch (err) {
      console.error('Failed to load settings', err);
      setFeedback({ type: 'error', message: 'ดึงข้อมูลการตั้งค่าไม่สำเร็จ' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreChange = (index: number, newScore: number) => {
    const updated = [...thresholds];
    updated[index].score = newScore;
    setThresholds(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      // Sort before saving
      const sorted = [...thresholds].sort((a, b) => b.score - a.score);
      
      const res = await fetch('/api/settings/ranks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholds: sorted }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      
      setFeedback({ type: 'success', message: 'บันทึกการตั้งค่าสำเร็จ!' });
      setThresholds(sorted);
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', message: 'บันทึกการตั้งค่าไม่สำเร็จ' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c1e] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] p-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gold/15 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <span className="text-xl">⚙️</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">ตั้งค่าเกณฑ์การเลื่อนยศ</h2>
              <p className="text-xs font-medium text-text-secondary mt-0.5">
                ปรับปรุงคะแนนขั้นต่ำสำหรับแต่ละยศ
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
        <div className="p-5 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-accent-gold"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 px-2">
                <div className="col-span-3">คะแนนขั้นต่ำ</div>
                <div className="col-span-9">ยศ / ตำแหน่ง (ตำรวจหลวง & ทหารยาม)</div>
              </div>
              
              {thresholds.map((threshold, index) => (
                <div key={`rank-${threshold.policeTitle}`} className="grid grid-cols-12 gap-4 items-center bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={threshold.score}
                      onChange={(e) => handleScoreChange(index, parseInt(e.target.value) || 0)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-accent-gold font-mono font-bold text-sm focus:outline-none focus:border-accent-gold/50"
                    />
                  </div>
                  <div className="col-span-9 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 shrink-0">ตำรวจ</span>
                      <span className="text-xs text-text-primary truncate">{threshold.policeTitle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 shrink-0">ทหารยาม</span>
                      <span className="text-xs text-text-primary truncate">{threshold.guardTitle}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              <p className="text-[10px] text-text-secondary mt-4 flex gap-1.5 items-start">
                <span className="text-accent-gold">💡</span>
                หมายเหตุ: การเปลี่ยนตัวเลขเกณฑ์คะแนนจะส่งผลกับการกำหนดค่าอัตโนมัติตอนนำเข้าไฟล์ Excel และปุ่ม "คำนวณอัตโนมัติ" ในหน้าแก้ไขรายบุคคล (ไม่กระทบกับคนที่คำนวณไปแล้ว)
              </p>

              {feedback && (
                <div className={`p-3 rounded-lg text-sm border ${feedback.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  {feedback.message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-black/20 p-4 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-6 py-2 rounded-lg text-sm font-bold bg-accent-gold text-black hover:bg-accent-gold-glowing shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all disabled:opacity-50"
          >
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      </div>
    </div>
  );
}
