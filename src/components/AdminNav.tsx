'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function AdminNav() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('th-TH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // Clear cookie client-side as fallback
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    router.push('/admin/login');
  };

  return (
    <nav className="glass-card glow-royal mb-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between border border-accent-gold/25">
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        {/* Settings Icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gold/15">
          <svg
            className="h-5 w-5 text-accent-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold text-text-primary tracking-wider">แผงควบคุมสังการการทำงาน (แอดมิน)</h1>
          <p className="text-xs text-text-secondary">{currentTime}</p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Back to Leaderboard */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm
            font-medium text-text-secondary transition-all hover:border-accent-gold/30
            hover:text-accent-gold hover:shadow-[0_0_15px_rgba(212,175,55,0.1)] cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          หน้าหลัก
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4
            py-2 text-sm font-medium text-red-400 transition-all hover:border-red-500/40
            hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          ออกจากระบบ
        </button>
      </div>
    </nav>
  );
}
