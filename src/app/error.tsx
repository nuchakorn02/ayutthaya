'use client';

import React, { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 relative z-10 text-center">
      {/* Background glow circle */}
      <div className="absolute h-72 w-72 rounded-full bg-accent-crimson/15 blur-3xl -z-10 animate-pulse" />

      {/* Warning Emblem */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/40 bg-red-950/40 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
        <svg
          className="h-10 w-10 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Header */}
      <h2 className="mb-2 text-2xl md:text-3xl font-black text-white">
        เกิดข้อผิดพลาดในการโหลดระบบ
      </h2>
      <p className="max-w-md text-sm text-text-secondary mb-6 leading-relaxed">
        ระบบไม่สามารถเชื่อมต่อหรือแสดงผลข้อมูลทำเนียบกำลังพลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ
      </p>

      {/* Error Details (collapsible) */}
      {error.message && (
        <div className="mb-6 max-w-md w-full rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left">
          <p className="text-[10px] font-mono text-red-400/80 break-words">
            {error.message}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="glass-card flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-accent-gold border border-accent-gold/40 rounded-xl hover:border-accent-gold hover:bg-accent-gold/10 transition-all hover:scale-105 cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.15)]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          ลองใหม่อีกครั้ง
        </button>
        <a
          href="/"
          className="glass-card px-5 py-2.5 text-sm font-semibold text-text-secondary border border-white/10 rounded-xl hover:text-text-primary hover:border-white/20 transition-all cursor-pointer"
        >
          กลับหน้าหลัก
        </a>
      </div>
    </div>
  );
}
