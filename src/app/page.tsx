'use client';

import { useState, useEffect, useCallback } from 'react';
import { Player } from '@/lib/types';
import SearchBar from '@/components/SearchBar';
import DivisionFilter from '@/components/DivisionFilter';
import Leaderboard from '@/components/Leaderboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import SkeletonLoader from '@/components/SkeletonLoader';
import ExecutiveBoard from '@/components/ExecutiveBoard';

export default function HomePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [division, setDivision] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [rankChanges, setRankChanges] = useState<Record<string, number>>({});

  // Slideshow banner setup
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideImages = [
    '/banner1.png',
    '/banner2.png',
    '/banner3.png',
    '/banner4.png',
    '/banner5.png'
  ];

  // Auto-slide effect every 2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideImages.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [slideImages.length]);

  const formatThaiDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' น.';
  };

  const fetchPlayers = useCallback(async (currentDiv?: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const url = currentDiv ? `/api/players?division=${encodeURIComponent(currentDiv)}` : '/api/players';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const playerList = json.data || [];
      setPlayers(playerList);
      
      if (json.lastUpdated) {
        setLastUpdated(formatThaiDateTime(json.lastUpdated));
      } else {
        setLastUpdated(null);
      }
    } catch (err) {
      console.error('Failed to fetch players:', err);
      setFetchError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setPlayers([]);
      setLastUpdated(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when division changes
  useEffect(() => {
    fetchPlayers(division);
  }, [division, fetchPlayers]);

  // Auto-refresh every 5 minutes so viewers see latest scores without manual reload
  useEffect(() => {
    const autoRefresh = setInterval(() => {
      fetchPlayers(division);
    }, 5 * 60 * 1000);
    return () => clearInterval(autoRefresh);
  }, [division, fetchPlayers]);

  // Local filtering and sorting logic for division and search
  useEffect(() => {
    let result = [...players];
    if (division) {
      // Sort by created_at ascending for specific divisions
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      // Sort by total_score descending for general leaderboard
      result.sort((a, b) => b.total_score - a.total_score);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((p) => p.player_name.toLowerCase().includes(query));
    }

    setFilteredPlayers(result);
  }, [players, division, search]);

  // คำนวณการเปลี่ยนแปลงลำดับ (rank positions moved ▲/▼)
  // แต่โชว์เฉพาะคนที่แต้มตัวเองเปลี่ยนจริงๆ เท่านั้น
  // เพื่อป้องกันกรณีที่ผู้เล่นใหม่เข้าระบบ แล้วทุกคนดูเหมือนขึ้นอันดับทั้งที่ไม่ได้ขึ้นจริง
  useEffect(() => {
    if (players.length === 0) return;

    const normalPlayers = players.filter((p) => p.division !== 'คณะผู้บริหาร');

    // 1. อันดับปัจจุบัน (เรียงตามแต้มตอนนี้)
    const currentSorted = [...normalPlayers].sort((a, b) => b.total_score - a.total_score);
    const currentRanks = new Map<string, number>();
    currentSorted.forEach((p, idx) => currentRanks.set(p.id, idx + 1));

    // 2. อันดับก่อนหน้า (เรียงตามแต้มก่อน import ล่าสุด)
    const previousSorted = [...normalPlayers].sort((a, b) => {
      const prevA = a.total_score - (a.latest_change || 0);
      const prevB = b.total_score - (b.latest_change || 0);
      return prevB - prevA;
    });
    const previousRanks = new Map<string, number>();
    previousSorted.forEach((p, idx) => previousRanks.set(p.id, idx + 1));

    // 3. โชว์ badge เฉพาะผู้เล่นที่แต้มตัวเองเปลี่ยนจริงๆ เท่านั้น
    const changes: Record<string, number> = {};
    normalPlayers.forEach((p) => {
      if (!p.latest_change || p.latest_change === 0) return; // ไม่เปลี่ยน = ไม่โชว์
      const curr = currentRanks.get(p.id) || 0;
      const prev = previousRanks.get(p.id) || 0;
      const rankDiff = prev - curr; // บวก = ขึ้นอันดับ, ลบ = ลงอันดับ
      if (rankDiff !== 0) changes[p.id] = rankDiff;
    });

    setRankChanges(changes);
  }, [players]);

  const handleDivisionChange = (value: string) => {
    setDivision(value);
    setSearch('');
  };

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 relative">
      {/* Admin Gateway Link */}
      <div className="flex justify-end mb-4 md:mb-0 relative md:absolute md:right-4 md:top-4 z-20 animate-slide-up">
        <a
          href="/admin"
          className="glass-card flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-bold tracking-wider text-accent-gold border border-accent-gold/20 rounded-xl hover:border-accent-gold/50 hover:bg-accent-gold/5 transition-all hover:scale-105 cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.05)]"
        >
          <svg className="h-3 w-3 md:h-3.5 md:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          เข้าสู่ระบบแอดมิน
        </a>
      </div>

      {/* Hero Section */}
      <header className="mb-2 text-center animate-slide-up relative z-10">
        {/* Logo Emblem Image */}
        <div className="inline-block mb-4 relative">
          <img 
            src="/logo.png" 
            alt="ตราสัญลักษณ์ กรมทหารราชวัลลภ" 
            className="h-28 w-28 md:h-36 md:w-36 object-contain rounded-full border border-accent-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:scale-105 transition-transform duration-300 relative z-10"
          />
          {/* Subtle golden background glow */}
          <div className="absolute inset-0 m-auto h-20 w-20 bg-accent-gold/25 blur-2xl rounded-full -z-10 animate-pulse-glow" />
        </div>

        <h1 className="mb-3 text-3xl font-black tracking-wider md:text-5xl text-shadow-md">
          <span className="bg-gradient-to-r from-accent-gold via-accent-gold-glowing to-accent-gold bg-clip-text text-transparent filter drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)] animate-pulse-glow">
            กรมทหารราชวัลลภ
          </span>
        </h1>
        <p className="mx-auto max-w-xl text-text-secondary text-sm md:text-base mb-6">
          กรมทหารมหาดเล็กราชวัลลภรักษาพระองค์
        </p>

        {/* Display Last Updated Time if available */}
        {lastUpdated && (
          <div className="mb-8 flex items-center justify-center gap-2 text-[11px] text-text-secondary font-mono bg-white/5 border border-white/5 rounded-full px-3.5 py-1.5 w-fit mx-auto shadow-[0_0_10px_rgba(255,255,255,0.02)]">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse-glow" />
            <span>อัปเดตแต้มล่าสุดเมื่อ: {lastUpdated}</span>
          </div>
        )}

        {/* Hero Mini Banner with Slideshow only */}
        <div className="w-full mb-1 overflow-hidden rounded-2xl border border-accent-gold/20 bg-black/40 relative h-48 sm:h-72 md:h-[450px] shadow-[0_0_25px_rgba(212,175,55,0.08)]">
          {/* Background Slideshow Images */}
          {slideImages.map((src, index) => (
            <div 
              key={src}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
              style={{ 
                backgroundImage: `url("${src}")`,
                opacity: currentSlide === index ? 1 : 0 
              }}
            />
          ))}
        </div>
      </header>

      {/* Stats Bar */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="glass-card flex items-center gap-3 px-5 py-3 border-l-4 border-l-accent-gold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-gold/15">
            <svg className="h-4 w-4 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">ทหารรักษาพระองค์</p>
            <p className="font-mono text-lg font-bold text-accent-gold">
              {filteredPlayers.length.toLocaleString()} นาย
            </p>
          </div>
        </div>

        {division && (
          <div className="glass-card flex items-center gap-3 px-5 py-3 border-l-4 border-l-accent-crimson">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-crimson/15">
              <svg className="h-4 w-4 text-accent-crimson" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">สังกัดกรมกอง</p>
              <p className="font-mono text-sm font-bold text-accent-crimson truncate max-w-[200px]">
                {division}
              </p>
            </div>
          </div>
        )}

        {search && (
          <div className="glass-card flex items-center gap-3 px-5 py-3 border-l-4 border-l-white/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <svg className="h-4 w-4 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">คำค้นหา</p>
              <p className="font-mono text-xs font-bold text-text-primary">&quot;{search}&quot;</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters Section */}
      <div className="mb-6 space-y-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex flex-col gap-4 md:flex-row">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <DivisionFilter value={division} onChange={handleDivisionChange} />
      </div>

      {/* Leaderboard & Executive Board */}
      <div className="animate-slide-up relative" style={{ animationDelay: '0.3s' }}>
        {/* Overlay Spinner for subsequent loads */}
        {loading && players.length > 0 && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-2xl">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-accent-gold/20 bg-[#0c0909]/95 px-6 py-4 shadow-[0_0_30px_rgba(212,175,55,0.15)] animate-float">
              <div className="relative h-8 w-8">
                <div
                  className="animate-spin-slow absolute inset-0 rounded-full border-2 border-transparent"
                  style={{
                    borderTopColor: '#d4af37',
                    borderRightColor: 'rgba(212, 175, 55, 0.25)',
                  }}
                />
                <div
                  className="animate-spin-slow absolute inset-0.5 rounded-full border-2 border-transparent"
                  style={{
                    borderBottomColor: '#a61b1b',
                    borderLeftColor: 'rgba(166, 27, 27, 0.25)',
                    animationDirection: 'reverse',
                    animationDuration: '1.2s',
                  }}
                />
              </div>
              <span className="text-[11px] font-bold tracking-widest text-accent-gold animate-pulse-glow">
                กำลังอัปเดตข้อมูล...
              </span>
            </div>
          </div>
        )}

        {loading && players.length === 0 && !fetchError ? (
          <SkeletonLoader />
        ) : fetchError ? (
          <div className="glass-card flex flex-col items-center justify-center px-8 py-20 border border-accent-crimson/30">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-crimson/10 border border-accent-crimson/30">
              <svg className="h-8 w-8 text-accent-crimson" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-accent-crimson">ไม่สามารถโหลดข้อมูลได้</h3>
            <p className="text-center text-sm text-text-secondary mb-6">{fetchError}</p>
            <button
              onClick={() => fetchPlayers(division)}
              className="glass-card flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-accent-gold border border-accent-gold/30 rounded-xl hover:border-accent-gold/60 hover:bg-accent-gold/5 transition-all hover:scale-105 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : (() => {
          const execPlayers = filteredPlayers.filter((p) => p.division === 'คณะผู้บริหาร');
          const normalPlayers = filteredPlayers.filter((p) => p.division !== 'คณะผู้บริหาร');
          
          return (
            <div className={loading ? 'opacity-30 pointer-events-none transition-opacity duration-300' : 'transition-opacity duration-300'}>
              {/* Executive Board */}
              <ExecutiveBoard players={execPlayers} />

              {/* Leaderboard Table (only show if we have normal players OR if we are not filtering by Executive Board) */}
              {(normalPlayers.length > 0 || (division !== 'คณะผู้บริหาร' && normalPlayers.length === 0)) && (
                <Leaderboard players={normalPlayers} isSortedByScore={!division} rankChanges={rankChanges} />
              )}
            </div>
          );
        })()}
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-text-secondary/40 text-xs py-8 relative z-10">
        <div className="mx-auto mb-6 h-[1px] w-32 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <p className="tracking-widest">
          xXShinmuXx Developer
        </p>
      </footer>

      {/* Floating Scroll to Top / Bottom Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 animate-slide-up">
        {/* Scroll to Top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="เลื่อนขึ้นบนสุด"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-gold/30 bg-[#0c0c1e]/80 text-accent-gold backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-accent-gold hover:bg-accent-gold/15 hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Scroll to Bottom */}
        <button
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
          title="เลื่อนลงล่างสุด"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-gold/30 bg-[#0c0c1e]/80 text-accent-gold backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-accent-gold hover:bg-accent-gold/15 hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </main>
  );
}
