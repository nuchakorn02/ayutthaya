'use client';

import { useState, useEffect } from 'react';
import { calculateDefaultPosition } from '@/lib/positionUtils';
import type { RankThreshold } from '@/lib/types';
import { DIVISIONS } from '@/lib/constants';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
}

export default function AddPlayerModal({ isOpen, onClose, onAdd }: AddPlayerModalProps) {
  const [playerName, setPlayerName] = useState('');
  const [division, setDivision] = useState<string>(DIVISIONS[0]);
  const [score, setScore] = useState('0');
  const [position, setPosition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [thresholds, setThresholds] = useState<RankThreshold[]>([]);

  useEffect(() => {
    fetch('/api/settings/ranks')
      .then((res) => res.json())
      .then((data) => {
        if (data.thresholds && Array.isArray(data.thresholds)) {
          setThresholds(data.thresholds.sort((a: RankThreshold, b: RankThreshold) => b.score - a.score));
        }
      })
      .catch((err) => console.error('Failed to load rank thresholds in AddPlayerModal:', err));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPlayerName('');
      setDivision(DIVISIONS[0]);
      setScore('0');
      setPosition('');
      setFeedback(null);
    }
  }, [isOpen]);

  const handleAutoCalculatePosition = () => {
    const numScore = Number(score) || 0;
    setPosition(calculateDefaultPosition(numScore, division, thresholds));
  };

  // Automatically recalculate position if user switches division
  useEffect(() => {
    if (division && score) {
      const numScore = Number(score) || 0;
      setPosition(calculateDefaultPosition(numScore, division, thresholds));
    }
  }, [division, score, thresholds]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setFeedback({ type: 'error', message: 'กรุณากรอกชื่อผู้เล่น' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // Check for duplicate player name before creating
      const checkRes = await fetch('/api/players');
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const existingPlayers: { player_name: string }[] = checkData.data || [];
        const duplicate = existingPlayers.find(
          (p) => p.player_name.toLowerCase() === playerName.trim().toLowerCase()
        );
        if (duplicate) {
          setFeedback({ type: 'error', message: `ชื่อ "${playerName.trim()}" มีอยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง` });
          setIsSubmitting(false);
          return;
        }
      }

      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: playerName.trim(),
          division,
          total_score: Number(score) || 0,
          position: position.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add player');
      }

      setFeedback({ type: 'success', message: 'เพิ่มกำลังพลใหม่เข้าระบบสำเร็จ!' });
      setTimeout(() => {
        onAdd();
        onClose();
      }, 1000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="modal-content glass-card glow-royal w-full max-w-md p-6 border-accent-gold/30">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-accent-gold flex items-center gap-2">
            <span>➕</span> เพิ่มกำลังพลใหม่เข้าระบบ
          </h3>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Player Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
              ชื่อผู้เล่น (Roblox Username)
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="เช่น xxXEZBOATZA_YTXxx"
              className="glass-card w-full px-4 py-2.5 text-sm text-text-primary
                outline-none transition-all duration-300 bg-bg-secondary/50 border-white/10
                focus:border-accent-gold/40 focus:shadow-[0_0_15px_rgba(212,175,55,0.08)]"
              required
            />
          </div>

          {/* Division Selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
              กองสังกัด
            </label>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="glass-card w-full px-4 py-2.5 text-sm text-text-primary
                outline-none transition-all duration-300 bg-bg-secondary/50 border-white/10
                focus:border-accent-gold/40 focus:shadow-[0_0_15px_rgba(212,175,55,0.08)]"
            >
              {DIVISIONS.map((div) => (
                <option key={div} value={div} className="bg-[#111128] text-text-primary">
                  {div}
                </option>
              ))}
            </select>
          </div>

          {/* Score Input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
              คะแนนเริ่มต้น (คะแนนสะสม)
            </label>
            <input
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              min="0"
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
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="ระบบจะคำนวณให้อัตโนมัติ หรือพิมพ์แก้ไขได้"
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
          <div className="flex gap-3 pt-2">
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
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-glowing
                px-4 py-3 text-sm font-bold text-bg-primary transition-all duration-300
                hover:shadow-[0_0_20px_rgba(212,175,55,0.25)] cursor-pointer
                disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'เพิ่มทหารใหม่'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
