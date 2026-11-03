'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import AdminNav from '@/components/AdminNav';
import TopIncreaseCard from '@/components/TopIncreaseCard';
import CsvImporter from '@/components/CsvImporter';
import ScoreUpdater from '@/components/ScoreUpdater';
import SearchBar from '@/components/SearchBar';
import DivisionFilter from '@/components/DivisionFilter';
import { Player, TopIncrease, ImportSession, ImportLog } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import AddPlayerModal from '@/components/AddPlayerModal';
import ScoreHistoryModal from '@/components/ScoreHistoryModal';
import RankSettingsModal from '@/components/RankSettingsModal';
import DiscordSettingsModal from '@/components/DiscordSettingsModal';
import type { ScoreHistory } from '@/lib/types';
import { calculateDefaultPosition, getDisplayPosition } from '@/lib/positionUtils';
import AdminAuditLogs, { AuditLog } from '@/components/admin/AdminAuditLogs';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminPlayerManager from '@/components/admin/AdminPlayerManager';
import AdminImportSystem from '@/components/admin/AdminImportSystem';
import { DivisionBarChart, DivisionDonutChart } from '@/components/admin/AdminCharts';



export default function AdminPage() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [topIncreases, setTopIncreases] = useState<(TopIncrease | null)[]>(
    Array(8).fill(null)
  );
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [weeklyPoints, setWeeklyPoints] = useState(0);
  const [division, setDivision] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [topLoading, setTopLoading] = useState(true);
  const [topIncreasesError, setTopIncreasesError] = useState('');
  const [logsLoading, setLogsLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Import sessions delta history state
  const [importSessions, setImportSessions] = useState<ImportSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ImportSession | null>(null);
  const [sessionLogs, setSessionLogs] = useState<ImportLog[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionLogsLoading, setSessionLogsLoading] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [sessionFilterType, setSessionFilterType] = useState<'all' | 'updates' | 'new' | 'resigned'>('all');

  // Reset & Rollback states
  const [isResetting, setIsResetting] = useState(false);
  const [rollingBackSessionId, setRollingBackSessionId] = useState<string | null>(null);
  const [rollbackProgress, setRollbackProgress] = useState(0);

  // Score History Modal states
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistoryPlayer, setSelectedHistoryPlayer] = useState<{name: string, division: string} | null>(null);
  const [historyData, setHistoryData] = useState<ScoreHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Rank Settings State
  const [rankSettingsOpen, setRankSettingsOpen] = useState(false);
  const [discordSettingsOpen, setDiscordSettingsOpen] = useState(false);
  const [rankThresholds, setRankThresholds] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/settings/ranks')
      .then(res => res.json())
      .then(data => {
        if (data.thresholds) {
          setRankThresholds(data.thresholds.sort((a: any, b: any) => b.score - a.score));
        }
      })
      .catch(console.error);
  }, [rankSettingsOpen]);

  const handleViewHistory = async (player: Player) => {
    setSelectedHistoryPlayer({ name: player.player_name, division: player.division });
    setHistoryData([]);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    
    try {
      const res = await fetch(`/api/players/${player.id}/history`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ดึงข้อมูลไม่สำเร็จ');
      
      // Sort history descending (newest first)
      const sortedHistory = (json.data || []).sort((a: ScoreHistory, b: ScoreHistory) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setHistoryData(sortedHistory);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงประวัติ');
      setHistoryModalOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRetirePlayer = async (player: Player) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการให้ "${player.player_name}" พ้นสภาพ/ลาออก?\nข้อมูลคะแนนจะยังถูกเก็บไว้ แต่ชื่อจะถูกซ่อนจากทำเนียบหลัก`)) {
      setIsDeleting(true);
      try {
        const res = await fetch(`/api/players/${player.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            retire: true,
            reason: 'พ้นสภาพ/ลาออก (Manual)'
          }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'เปลี่ยนสถานะไม่สำเร็จ');
        }
        showToast('success', `เปลี่ยนสถานะ "${player.player_name}" เป็นพ้นสภาพเรียบร้อยแล้ว`);
        fetchPlayers();
        fetchTopIncreases();
        fetchLogs();
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleResetDatabase = async () => {
    const confirm1 = confirm('🚨 คำเตือนขั้นเด็ดขาด! คุณต้องการล้างฐานข้อมูลทหารทั้งหมดใช่หรือไม่? ประวัติคะแนนสะสมและบันทึกเซสชันทั้งหมดจะถูกลบอย่างถาวร!');
    if (!confirm1) return;
    
    const confirm2 = confirm('ต้องการดำเนินการต่อจริงๆ ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้!');
    if (!confirm2) return;
    
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESET_ALL' }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'ล้างฐานข้อมูลไม่สำเร็จ');
      }
      showToast('success', 'ล้างฐานข้อมูลสำเร็จเรียบร้อยแล้ว!');
      fetchPlayers();
      fetchTopIncreases();
      fetchLogs();
      fetchImportSessions();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการล้างฐานข้อมูล');
    } finally {
      setIsResetting(false);
    }
  };

  const handleRollbackSession = async (session: ImportSession) => {
    const confirmMsg = `ต้องการย้อนกลับ (Rollback) เซสชันการนำเข้าไฟล์ "${session.filename}" ใช่หรือไม่?\nการดำเนินการนี้จะลบผู้เล่นใหม่ที่สร้างขึ้นจากไฟล์นี้ และย้อนคะแนนของทหารทุกคนกลับเป็นค่าก่อนการอัปโหลดไฟล์นี้!`;
    if (!confirm(confirmMsg)) return;

    setRollingBackSessionId(session.id);
    setRollbackProgress(0);

    // Simulated progress interval
    let progress = 0;
    const interval = setInterval(() => {
      if (progress < 40) {
        progress += Math.floor(Math.random() * 8) + 6;
      } else if (progress < 80) {
        progress += Math.floor(Math.random() * 4) + 2;
      } else if (progress < 96) {
        progress += 1;
      }
      setRollbackProgress(Math.min(progress, 96));
    }, 150);

    let rollbackSuccess = false;
    let rollbackError: string | null = null;

    try {
      const res = await fetch(`/api/admin/imports/${session.id}/rollback`, {
        method: 'POST',
      });
      clearInterval(interval);
      setRollbackProgress(100);

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'ย้อนกลับเซสชันไม่สำเร็จ');
      }

      rollbackSuccess = true;
      // Small delay to let user see 100% completion before hiding
      await new Promise((resolve) => setTimeout(resolve, 700));

      setSelectedSession(null);
      setSessionLogs([]);
      fetchPlayers();
      fetchTopIncreases();
      fetchLogs();
      fetchImportSessions();
    } catch (err) {
      clearInterval(interval);
      setRollbackProgress(0);
      rollbackError = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการย้อนกลับ';
    } finally {
      // Only reset state after the delay above has completed
      setRollingBackSessionId(null);
      setRollbackProgress(0);
      if (rollbackSuccess) {
        showToast('success', `ย้อนกลับเซสชัน "${session.filename}" สำเร็จเรียบร้อยแล้ว!`);
      } else if (rollbackError) {
        showToast('error', rollbackError);
      }
    }
  };

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/players');
      const json = await res.json();
      const playerList = json.data || [];
      setPlayers(playerList);
      setAllPlayers(playerList);
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTopIncreases = useCallback(async () => {
    setTopLoading(true);
    setTopIncreasesError('');
    try {
      const res = await fetch('/api/admin/top-increases');
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'ดึงข้อมูลคะแนนที่เพิ่มสูงสุดไม่สำเร็จ');
      }
      if (!Array.isArray(json.data)) {
        throw new Error('รูปแบบข้อมูลคะแนนที่เพิ่มสูงสุดไม่ถูกต้อง');
      }

      const items: TopIncrease[] = json.data;
      const divisionNames = [
        'กองทัพมหาเสือพิทักษ์',
        'กองทัพธรณินพิทักษ์',
        'กองทัพอาทมาต',
        'กองพระตำรวจหลวง',
        'กองทัพที่ 1 ปัญจะซันยะ',
        'กองทัพที่ 2 วัชรนาถ',
        'กองทัพที่ 3 ปุณฑริก',
        'กองทัพที่ 4 เกาโมทก'
      ];
      const mapped: (TopIncrease | null)[] = Array(8).fill(null);
      items.forEach((item) => {
        const idx = divisionNames.indexOf(item.division);
        if (idx !== -1) {
          mapped[idx] = item;
        }
      });
      setTopIncreases(mapped);
    } catch (err) {
      console.error('Failed to fetch top increases:', err);
      setTopIncreasesError(err instanceof Error ? err.message : 'ดึงข้อมูลคะแนนที่เพิ่มสูงสุดไม่สำเร็จ');
    } finally {
      setTopLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/logs');
      const json = await res.json();
      setLogs(json.data || []);
    } catch (err) {
      console.error('Failed to fetch admin logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const fetchWeeklyPoints = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/logs?since=7d');
      const json = await res.json();
      const entries: AuditLog[] = json.data || [];
      const total = entries.reduce((sum, e) => sum + Math.abs(e.score_diff), 0);
      setWeeklyPoints(total);
    } catch (err) {
      console.error('Failed to fetch weekly points:', err);
    }
  }, []);

  const fetchImportSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/admin/imports');
      const json = await res.json();
      const sessions = json.data || [];
      setImportSessions(sessions);
      if (sessions.length > 0) {
        setSelectedSession(sessions[0]);
      }
    } catch (err) {
      console.error('Failed to fetch import sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const fetchSessionLogs = useCallback(async (sessionId: string) => {
    setSessionLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/imports/${sessionId}`);
      const json = await res.json();
      setSessionLogs(json.data || []);
    } catch (err) {
      console.error('Failed to fetch session logs:', err);
    } finally {
      setSessionLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
    fetchTopIncreases();
    fetchLogs();
    fetchWeeklyPoints();
    fetchImportSessions();
  }, [fetchPlayers, fetchTopIncreases, fetchLogs, fetchWeeklyPoints, fetchImportSessions]);

  // Auto-refresh every 5 minutes to keep data up-to-date
  useEffect(() => {
    const autoRefresh = setInterval(() => {
      fetchPlayers();
      fetchTopIncreases();
      fetchLogs();
      fetchWeeklyPoints();
    }, 5 * 60 * 1000);
    return () => clearInterval(autoRefresh);
  }, [fetchPlayers, fetchTopIncreases, fetchLogs, fetchWeeklyPoints]);

  const handleRefreshAll = () => {
    fetchPlayers();
    fetchTopIncreases();
    fetchLogs();
    fetchWeeklyPoints();
    fetchImportSessions();
    showToast('success', 'รีโหลดข้อมูลทั้งหมดแล้ว');
  };

  useEffect(() => {
    if (selectedSession) {
      fetchSessionLogs(selectedSession.id);
    }
  }, [selectedSession, fetchSessionLogs]);

  // Local filtering logic for division and search
  useEffect(() => {
    let result = [...allPlayers];
    if (division) {
      result = result.filter((p) => p.division === division);
      // Sort by created_at ascending to strictly respect Excel sheet ordering
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((p) => p.player_name.toLowerCase().includes(query));
    }
    setFilteredPlayers(result);
  }, [search, division, allPlayers]);

  const handleDivisionChange = (value: string) => {
    setDivision(value);
    setSearch('');
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const handleUpdateComplete = () => {
    fetchPlayers();
    fetchTopIncreases();
    fetchLogs();
  };

  const handleImportComplete = () => {
    fetchPlayers();
    fetchTopIncreases();
    fetchLogs();
    fetchImportSessions();
  };

  // Premium Excel Exporter function
  const handleExportExcel = () => {
    if (allPlayers.length === 0) {
      alert('ไม่มีข้อมูลกำลังรบในระบบที่จะส่งออกได้ในขณะนี้');
      return;
    }

    // Map database keys to Thai clean headers
    const dataToExport = allPlayers.map((player, idx) => ({
      'ลำดับ': idx + 1,
      'ชื่อผู้เล่น (Roblox Name)': player.player_name,
      'คะแนนสะสม (แต้มทำงาน)': player.total_score,
      'คะแนนเริ่มแรก': player.starting_score || player.total_score,
      'แต้มรบที่ทำได้เพิ่มสุทธิ': player.latest_change || 0,
      'กองสังกัด': player.division,
      'ตำแหน่ง/ยศรักษาพระองค์': player.position || 'พลอาสาสมัครทหารยาม',
      'วันที่ลงทะเบียนรบ': new Date(player.created_at).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Set professional column widths
    worksheet['!cols'] = [
      { wch: 8 },  // ลำดับ
      { wch: 25 }, // ชื่อผู้เล่น
      { wch: 22 }, // คะแนนสะสม
      { wch: 15 }, // คะแนนเริ่มแรก
      { wch: 22 }, // แต้มรบที่ทำได้เพิ่มสุทธิ
      { wch: 25 }, // กองสังกัด
      { wch: 35 }, // ตำแหน่ง/ยศ
      { wch: 18 }  // วันที่ลงทะเบียนรบ
    ];

    // Create workbook and write
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'บัญชีทำเนียบทหารรักษาพระองค์');

    // Filename in Thai with current Date backup stamp
    const dateStamp = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
    XLSX.writeFile(workbook, `ทำเนียบทหารรักษาพระองค์_สำรองข้อมูล_${dateStamp}.xlsx`);
  };

  const divisionColors: Record<string, string> = {
    'คณะผู้บริหาร': 'text-purple-400',
    'กองทัพธรณินพิทักษ์': 'text-violet-400',
    'กองทัพมหาเสือพิทักษ์': 'text-amber-500',
    'กองทัพอาทมาต': 'text-zinc-400',
    'กองพระตำรวจหลวง': 'text-amber-500',
    'กองทัพที่ 1 ปัญจะซันยะ': 'text-slate-300',
    'กองทัพที่ 2 วัชรนาถ': 'text-rose-400',
    'กองทัพที่ 3 ปุณฑริก': 'text-emerald-400',
    'กองทัพที่ 4 เกาโมทก': 'text-sky-400',
  };

  const divisionCounts = allPlayers.reduce((acc, p) => { acc[p.division] = (acc[p.division] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6">
      {/* Navigation */}
      <AdminNav />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] flex items-start gap-3 rounded-2xl border px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md animate-slide-up max-w-sm ${
            toast.type === 'success'
              ? 'border-green-500/30 bg-[#0c0c1e]/95 text-green-400'
              : toast.type === 'warning'
              ? 'border-accent-gold/30 bg-[#0c0c1e]/95 text-accent-gold'
              : 'border-accent-crimson/30 bg-[#0c0c1e]/95 text-accent-crimson'
          }`}
        >
          <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
            toast.type === 'success' ? 'bg-green-500/15' : toast.type === 'warning' ? 'bg-accent-gold/15' : 'bg-accent-crimson/15'
          }`}>
            {toast.type === 'success' ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : toast.type === 'warning' ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <p className="text-sm font-semibold leading-snug">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="ml-auto flex-shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {/* Part 2: Command Analytics Dashboard */}
      <AdminDashboard allPlayers={allPlayers} weeklyPoints={weeklyPoints} />

      {/* Section 1: Top Score Increases */}
      <section className="mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-cyan/15">
            <svg className="h-4 w-4 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-primary">คะแนนที่เพิ่มสูงสุด</h2>
        </div>

        {topLoading ? (
          <LoadingSpinner />
        ) : topIncreasesError ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {topIncreasesError}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topIncreases.map((data, index) => {
              const divisionNames = [
                'กองทัพมหาเสือพิทักษ์',
                'กองทัพธรณินพิทักษ์',
                'กองทัพอาทมาต',
                'กองพระตำรวจหลวง',
                'กองทัพที่ 1 ปัญจะซันยะ',
                'กองทัพที่ 2 วัชรนาถ',
                'กองทัพที่ 3 ปุณฑริก',
                'กองทัพที่ 4 เกาโมทก'
              ];
              return (
                <TopIncreaseCard
                  key={index}
                  data={data}
                  division={divisionNames[index]}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Player Management */}
      <AdminPlayerManager 
        divisionCounts={divisionCounts}
        filteredPlayers={filteredPlayers}
        loading={loading}
        search={search}
        setSearch={setSearch}
        division={division}
        handleDivisionChange={handleDivisionChange}
        handleRefreshAll={handleRefreshAll}
        handleExportExcel={handleExportExcel}
        resetDatabase={handleResetDatabase}
        isResetting={isResetting}
        setRankSettingsOpen={setRankSettingsOpen}
        setDiscordSettingsOpen={setDiscordSettingsOpen}
        setIsAddModalOpen={setIsAddModalOpen}
        handleEditPlayer={handleEditPlayer}
        handleDeletePlayer={handleRetirePlayer}
        openHistory={handleViewHistory}
        rankThresholds={rankThresholds}
      />

      {/* Section 3 & 4: Import System */}
      <AdminImportSystem 
        handleImportComplete={handleImportComplete}
        importSessions={importSessions}
        selectedSession={selectedSession}
        setSelectedSession={setSelectedSession}
        sessionLogs={sessionLogs}
        sessionsLoading={sessionsLoading}
        sessionLogsLoading={sessionLogsLoading}
        sessionSearchQuery={sessionSearchQuery}
        setSessionSearchQuery={setSessionSearchQuery}
        sessionFilterType={sessionFilterType}
        setSessionFilterType={setSessionFilterType}
        handleRollbackSession={handleRollbackSession}
        rollingBackSessionId={rollingBackSessionId}
        rollbackProgress={rollbackProgress}
      />

      {/* Part 3: Section 4 - Admin Audit Logs */}
      <AdminAuditLogs logs={logs} loading={logsLoading} />

      {/* Score Updater Modal */}
      <ScoreUpdater
        player={editingPlayer}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPlayer(null);
        }}
        onUpdate={handleUpdateComplete}
      />

      {/* Quick Add Player Modal */}
      <AddPlayerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleUpdateComplete}
      />

      <ScoreHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        playerName={selectedHistoryPlayer?.name || ''}
        division={selectedHistoryPlayer?.division || ''}
        historyData={historyData}
        isLoading={historyLoading}
      />

      {/* Rank Settings Modal */}
      <RankSettingsModal
        isOpen={rankSettingsOpen}
        onClose={() => setRankSettingsOpen(false)}
      />

      {/* Discord Webhook Settings Modal */}
      <DiscordSettingsModal
        isOpen={discordSettingsOpen}
        onClose={() => setDiscordSettingsOpen(false)}
      />

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
