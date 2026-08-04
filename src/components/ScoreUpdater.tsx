'use client';

import { useState, useEffect } from 'react';
import { Player, RankThreshold } from '@/lib/types';

interface ScoreUpdaterProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ScoreUpdater({ player, isOpen, onClose, onUpdate }: ScoreUpdaterProps) {
  const [newScore, setNewScore] = useState('');
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [thresholds, setThresholds] = useState<RankThreshold[]>([]);

  useEffect(() => {
    fetch('/api/settings/ranks')
      .then(res => res.json())
      .then(data => {
        if (data.thresholds) {
          setThresholds(data.thresholds.sort((a: any, b: any) => b.score - a.score));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (player) {
      // Bug fix: ไม่แสดง -999 ในช่อง input ถ้าทหารพ้นสภาพไปแล้ว
      const displayScore = player.total_score === -999 ? 0 : player.total_score;
      setNewScore(String(displayScore));
      setNewName(player.player_name);
      setNewPosition(player.position || '');
      setReason('');
      setFeedback(null);
    }
  }, [player]);

  if (!isOpen || !player) return null;

  const handleAutoCalculatePosition = () => {
    const score = Number(newScore) || 0;
    
    // Preserve special leader and instructor titles if already assigned to avoid overwriting them
    if (
      player.position?.startsWith('ปลัดราชวัลลภ') ||
      player.position === 'พระยามหาเสือ' ||
      player.position === 'พระยาอัครอารักษ์' ||
      player.position === 'พระยาอาทมาตราชภักดี' ||
      player.position?.startsWith('ครูฝึก')
    ) {
      setNewPosition(player.position);
      return;
    }

    // Special divisions assignment
    if (player.division === 'กองทัพมหาเสือพิทักษ์') {
      setNewPosition('ทหารเสือประจำพระองค์');
      return;
    }
    if (player.division === 'กองทัพธรณินพิทักษ์') {
      setNewPosition('ทหารธรณินพิทักษ์');
      return;
    }
    if (player.division === 'กองทัพอาทมาต') {
      setNewPosition('หมื่นอาทมาต');
      return;
    }

    const isPolice = player.division === 'กองพระตำรวจหลวง';
    
    // Score based rank assignment (excluding ครูฝึก)
    if (thresholds.length > 0) {
      for (const t of thresholds) {
        if (score >= t.score) {
          setNewPosition(isPolice ? t.policeTitle : t.guardTitle);
          return;
        }
      }
      const last = thresholds[thresholds.length - 1];
      setNewPosition(isPolice ? last.policeTitle : last.guardTitle);
      return;
    }

    // Fallback if settings are not loaded
    if (score >= 600) {
      setNewPosition(isPolice ? 'พันตำรวจหลวง | Royal Police Colonel' : 'นายพันเวร | Battalion Commander of Guardsmen');
    } else if (score >= 315) {
      setNewPosition(isPolice ? 'นายกองตำรวจหลวง | Royal Police Battalion Commander' : 'นายกองเวร | Company Head Guardsmen');
    } else if (score >= 210) {
      setNewPosition(isPolice ? 'นายหมวดตำรวจหลวง | Royal Police Platoon Officer' : 'นายหมวดเวร | Platoon Head Guardsmen');
    } else if (score >= 110) {
      setNewPosition(isPolice ? 'นายหมู่ตำรวจหลวง | Royal Police Squad Leader' : 'นายหมู่เวร | Squad Head Guardsmen');
    } else if (score >= 60) {
      setNewPosition(isPolice ? 'พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper' : 'พลทหารยามอาวุโส | Senior Guardsmen');
    } else if (score >= 45) {
      setNewPosition(isPolice ? 'พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper' : 'พลทหารราชวัลลภพิเศษ | Royal Elite Guardsmen');
    } else if (score >= 20) {
      setNewPosition(isPolice ? 'พลประจำการตำรวจหลวง | Active Royal Police Trooper' : 'พลทหารยาม | Guardsmen');
    } else {
      setNewPosition(isPolice ? 'พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)' : 'พลอาสาสมัครทหารยาม | Junior Guardsmen');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Bug fix: ป้องกันการ submit -999 โดยบังเอิญ
      const scoreNum = Number(newScore);
      if (scoreNum === -999) {
        setFeedback({ type: 'error', message: 'ไม่สามารถเซ็ตคะแนนเป็น -999 ได้โดยตรง ถ้าต้องการให้พ้นสภาพ กรุณากดปุ่มด้านล่างแทน' });
        return;
      }

      const trimmedName = newName.trim();
      if (!trimmedName) {
        setFeedback({ type: 'error', message: 'ชื่อผู้เล่นห้ามว่างเปล่า' });
        return;
      }
      if (trimmedName.length > 50) {
        setFeedback({ type: 'error', message: 'ชื่อผู้เล่นต้องไม่เกิน 50 ตัวอักษร' });
        return;
      }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_score: Number(newScore),
          position: newPosition.trim() || null,
          reason: reason.trim() || null,
          // เปลี่ยนชื่อเฉพาะตอนที่ชื่อเปลี่ยนจริง
          ...(newName.trim() !== player.player_name ? { player_name: newName.trim() } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Update failed');
      }

      setFeedback({ type: 'success', message: 'อัปเดตข้อมูลผู้เล่นสำเร็จ!' });
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปเดต',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetire = async () => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการให้ "${player.player_name}" พ้นสภาพ/ลาออก?\nข้อมูลคะแนนจะยังถูกเก็บไว้ แต่ชื่อจะถูกซ่อนจากทำเนียบหลัก`)) {
      setIsDeleting(true);
      setFeedback(null);

      try {
        const res = await fetch(`/api/players/${player.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total_score: -999,
            division: 'ปลดประจำการ',
            reason: 'พ้นสภาพ/ลาออก (Manual)'
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'เปลี่ยนสถานะไม่สำเร็จ');
        }

        setFeedback({ type: 'success', message: 'เปลี่ยนสถานะเป็นพ้นสภาพเรียบร้อยแล้ว!' });
        setTimeout(() => {
          onUpdate();
          onClose();
        }, 1000);
      } catch (err) {
        setFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ',
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="modal-content glass-card glow-royal w-full max-w-md p-6 border-accent-gold/30">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-accent-gold">แก้ไขและจัดการผู้เล่น</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5
              text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Retired Player Warning Banner */}
        {player.total_score === -999 && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
            <span className="text-amber-400 text-sm shrink-0">⚠️</span>
            <p className="text-xs text-amber-400 font-medium">
              ทหารคนนี้พ้นสภาพ/ลาออกไปแล้ว ถ้าต้องการนำกลับเข้าประจำการ ให้แก้คะแนนและกดบันทึกการแก้ไขได้เลย
            </p>
          </div>
        )}

        {/* Player Info Card */}
        <div className="mb-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">ผู้เล่น</p>
          <p className="text-lg font-semibold text-text-primary">{player.player_name}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
            <span className="font-semibold text-accent-gold">{player.division}</span>
            <span>•</span>
            <span>ยศดั้งเดิม: {player.position || 'ไม่มีตำแหน่ง'}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Player Name Input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
              ชื่อ Roblox (เปลี่ยนชื่อ)
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={50}
              placeholder="ชื่อ Roblox ของผู้เล่น"
              className="glass-card w-full px-4 py-2.5 text-base text-text-primary
                outline-none transition-all duration-300 bg-bg-secondary/50 border-white/10
                focus:border-accent-gold/40 focus:shadow-[0_0_15px_rgba(212,175,55,0.08)]"
              required
            />
            {newName.trim() !== player.player_name && newName.trim().length > 0 && (
              <p className="mt-1 text-[10px] text-amber-400 font-medium">
                ⚠️ จะเปลี่ยนชื่อจาก <span className="font-mono">{player.player_name}</span> → <span className="font-mono">{newName.trim()}</span>
              </p>
            )}
          </div>

          {/* Score Input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
              คะแนนแต้มการทำงาน
            </label>
            <input
              type="number"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              className="glass-card w-full px-4 py-2.5 font-mono text-base text-text-primary
                outline-none transition-all duration-300 bg-bg-secondary/50 border-white/10
                focus:border-accent-gold/40 focus:shadow-[0_0_15px_rgba(212,175,55,0.08)]"
              required
            />
          </div>


          {/* Position Input */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                ยศ / ตำแหน่ง
              </label>
              <button
                type="button"
                onClick={handleAutoCalculatePosition}
                className="text-[10px] font-bold text-accent-gold hover:underline cursor-pointer"
              >
                ⚡ คำนวณยศตามแต้มอัตโนมัติ
              </button>
            </div>
            <input
              type="text"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              placeholder="เช่น นายพันเวร, พลทหารยาม..."
              className="glass-card w-full px-4 py-2.5 text-sm text-text-primary
                outline-none transition-all duration-300 bg-bg-secondary/50 border-white/10
                focus:border-accent-gold/40 focus:shadow-[0_0_15px_rgba(212,175,55,0.08)]"
            />
          </div>

          {/* Reason Input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
              ระบุเหตุผลการปรับแต้ม (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น ตรวจพระนครเวรคืนวันที่ 14, ฝึกฝนทหารใหม่..."
              className="glass-card w-full px-4 py-2.5 text-sm text-text-primary
                outline-none transition-all duration-300 bg-bg-secondary/50 border-white/10
                focus:border-accent-gold/40 focus:shadow-[0_0_15px_rgba(212,175,55,0.08)]"
            />
          </div>

          {/* Feedback Messages */}
          {feedback && (
            <div
              className={`rounded-xl border p-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-green-500/20 bg-green-500/10 text-green-400'
                  : 'border-red-500/20 bg-red-500/10 text-red-400'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold
                  text-text-secondary transition-all hover:bg-white/5 hover:text-text-primary cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="flex-1 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-glowing
                  px-4 py-3 text-sm font-bold text-bg-primary transition-all duration-300
                  hover:shadow-[0_0_20px_rgba(212,175,55,0.25)] cursor-pointer
                  disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>

            {/* Danger Zone: Retire Player */}
            <div className="border-t border-white/5 mt-2 pt-3">
              <button
                type="button"
                onClick={handleRetire}
                disabled={isSubmitting || isDeleting}
                className="w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5
                  text-xs font-bold text-red-400 transition-all duration-300
                  hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'กำลังเปลี่ยนสถานะ...' : '⚠️ เปลี่ยนสถานะทหารคนนี้ให้พ้นสภาพ/ลาออก'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
