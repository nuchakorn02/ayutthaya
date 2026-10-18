import React from 'react';

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 relative z-10">
      {/* Background glow circle */}
      <div className="absolute h-64 w-64 rounded-full bg-accent-gold/10 blur-3xl -z-10 animate-pulse-glow" />

      {/* Royal Emblem */}
      <div className="relative mb-6">
        <img
          src="/logo.png"
          alt="ตราสัญลักษณ์ กรมทหารราชวัลลภ"
          className="h-24 w-24 md:h-28 md:w-28 object-contain rounded-full border border-accent-gold/40 shadow-[0_0_25px_rgba(212,175,55,0.3)] animate-pulse"
        />
        <div className="absolute inset-0 rounded-full border-2 border-accent-gold/40 border-t-transparent animate-spin" />
      </div>

      {/* Title & Status */}
      <h2 className="mb-2 text-xl md:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-accent-gold via-accent-gold-glowing to-accent-gold">
        กรมทหารราชวัลลภ
      </h2>
      <p className="text-xs md:text-sm text-text-secondary font-medium tracking-wide flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-accent-gold animate-ping" />
        กำลังโหลดทำเนียบกำลังพลรักษาพระองค์...
      </p>
    </div>
  );
}
