'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Player, TopIncrease, ImportSession, ImportLog } from '@/lib/types';
import AdminNav from '@/components/AdminNav';
import TopIncreaseCard from '@/components/TopIncreaseCard';
import CsvImporter from '@/components/CsvImporter';
import ScoreUpdater from '@/components/ScoreUpdater';
import SearchBar from '@/components/SearchBar';
import DivisionFilter from '@/components/DivisionFilter';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AuditLog {
  id: string;
  old_score: number;
  new_score: number;
  score_diff: number;
  updated_at: string;
  players: {
    player_name: string;
    division: string;
  } | null;
}

function calculateDefaultPosition(score: number, division: string): string {
  if (division === 'กองทัพมหาเสือพิทักษ์') {
    return 'ทหารเสือประจำพระองค์';
  }
  if (division === 'กองทัพธรณินพิทักษ์') {
    return 'ทหารธรณินพิทักษ์';
  }
  if (division === 'กองทัพอาทมาต') {
    return 'หมื่นอาทมาต';
  }

  const isPolice = division === 'กองพระตำรวจหลวง';

  if (score >= 600) return isPolice ? 'พันตำรวจหลวง | Royal Police Colonel' : 'นายพันเวร | Battalion Commander of Guardsmen';
  if (score >= 315) return isPolice ? 'นายกองตำรวจหลวง | Royal Police Battalion Commander' : 'นายกองเวร | Company Head Guardsmen';
  if (score >= 210) return isPolice ? 'นายหมวดตำรวจหลวง | Royal Police Platoon Officer' : 'นายหมวดเวร | Platoon Head Guardsmen';
  if (score >= 110) return isPolice ? 'นายหมู่ตำรวจหลวง | Royal Police Squad Leader' : 'นายหมู่เวร | Squad Head Guardsmen';
  if (score >= 60) return isPolice ? 'พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper' : 'พลทหารยามอาวุโส | Senior Guardsmen';
  if (score >= 45) return isPolice ? 'พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper' : 'พลทหารราชวัลลภพิเศษ | Royal Elite Guardsmen';
  if (score >= 20) return isPolice ? 'พลประจำการตำรวจหลวง | Active Royal Police Trooper' : 'พลทหารยาม | Guardsmen';
  return isPolice ? 'พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)' : 'พลอาสาสมัครทหารยาม | Junior Guardsmen';
}

function getDisplayPosition(position: string | undefined, score: number, division: string): string {
  const basePos = position || calculateDefaultPosition(score, division);
  if (division === 'กองพระตำรวจหลวง' && basePos) {
    if (basePos.includes('ครูฝึกทหารราชองครักษ์') || basePos.includes('Drill Master of the Royal Guards')) {
      return 'ครูฝึกตำรวจหลวง สายทอง | Royal Police Instructor (Golden Line)';
    }
    if (basePos.startsWith('นายพันเวร')) return 'พันตำรวจหลวง | Royal Police Colonel';
    if (basePos.startsWith('นายกองเวร')) return 'นายกองตำรวจหลวง | Royal Police Battalion Commander';
    if (basePos.startsWith('นายหมวดเวร')) return 'นายหมวดตำรวจหลวง | Royal Police Platoon Officer';
    if (basePos.startsWith('นายหมู่เวร')) return 'นายหมู่ตำรวจหลวง | Royal Police Squad Leader';
    if (basePos.startsWith('พลทหารยามอาวุโส')) return 'พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper';
    if (basePos.startsWith('พลทหารราชวัลลภพิเศษ')) return 'พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper';
    if (basePos.startsWith('พลทหารยาม')) return 'พลประจำการตำรวจหลวง | Active Royal Police Trooper';
    if (basePos.startsWith('พลอาสาสมัครทหารยาม')) return 'พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)';
  }
  return basePos;
}

function DivisionBarChart({ data }: { data: { name: string; totalScore: number }[] }) {
  const maxScore = Math.max(...data.map(d => d.totalScore), 1);
  const chartHeight = 220;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingLeft = 45;
  const paddingRight = 15;
  
  const getShortName = (name: string) => {
    return name
      .replace('กองทัพมหาเสือพิทักษ์', 'มหาเสือ')
      .replace('กองทัพธรณินพิทักษ์', 'ธรณิน')
      .replace('กองทัพอาทมาต', 'อาทมาต')
      .replace('กองพระตำรวจหลวง', 'ตำรวจหลวง')
      .replace('กองทัพที่ 1 ปัญจะซันยะ', 'ทัพ 1')
      .replace('กองทัพที่ 2 วัชรนาถ', 'ทัพ 2')
      .replace('กองทัพที่ 3 ปุณฑริก', 'ทัพ 3')
      .replace('กองทัพที่ 4 เกาโมทก', 'ทัพ 4');
  };

  const colors = [
    '#fbbf24', // มหาเสือ (gold)
    '#a855f7', // ธรณิน (purple)
    '#71717a', // อาทมาต (zinc)
    '#f97316', // ตำรวจหลวง (orange)
    '#94a3b8', // ทัพ 1 (slate)
    '#f43f5e', // ทัพ 2 (rose)
    '#8b5cf6', // ทัพ 3 (violet)
    '#0ea5e9'  // ทัพ 4 (sky)
  ];

  return (
    <div className="w-full">
      <svg viewBox="0 0 500 240" className="w-full h-auto select-none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingTop + (chartHeight - paddingTop - paddingBottom) * (1 - ratio);
          const val = Math.round(maxScore * ratio);
          return (
            <g key={idx} className="opacity-20">
              <line x1={paddingLeft} y1={y} x2={500 - paddingRight} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
              <text x={paddingLeft - 8} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end" className="font-mono">
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, idx) => {
          const count = data.length;
          const barWidth = 32;
          const gap = (500 - paddingLeft - paddingRight - (barWidth * count)) / (count - 1);
          const x = paddingLeft + idx * (barWidth + gap);
          
          const graphHeight = chartHeight - paddingTop - paddingBottom;
          const barHeight = maxScore > 0 ? (d.totalScore / maxScore) * graphHeight : 0;
          const y = chartHeight - paddingBottom - barHeight;
          const color = colors[idx] || '#00f0ff';
          const shortName = getShortName(d.name);

          return (
            <g key={d.name} className="group">
              {/* Background trace */}
              <rect
                x={x}
                y={paddingTop}
                width={barWidth}
                height={graphHeight}
                fill="rgba(255,255,255,0.02)"
                rx="4"
              />

              {/* Foreground bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 3)}
                fill={color}
                rx="4"
                className="transition-all duration-500 ease-out hover:opacity-80"
                style={{ filter: `drop-shadow(0 0 6px ${color}44)` }}
              />

              {/* Value on top of bar */}
              {d.totalScore > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  fill="#e2e8f0"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono opacity-80"
                >
                  {d.totalScore.toFixed(0)}
                </text>
              )}

              {/* X label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - paddingBottom + 16}
                fill="#94a3b8"
                fontSize="9"
                textAnchor="middle"
                className="font-medium"
              >
                {shortName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DivisionDonutChart({ data }: { data: { name: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const size = 200;
  const radius = 70;
  const strokeWidth = 18;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const getShortName = (name: string) => {
    return name
      .replace('กองทัพมหาเสือพิทักษ์', 'มหาเสือ')
      .replace('กองทัพธรณินพิทักษ์', 'ธรณิน')
      .replace('กองทัพอาทมาต', 'อาทมาต')
      .replace('กองพระตำรวจหลวง', 'ตำรวจ')
      .replace('กองทัพที่ 1 ปัญจะซันยะ', 'ทัพ 1')
      .replace('กองทัพที่ 2 วัชรนาถ', 'ทัพ 2')
      .replace('กองทัพที่ 3 ปุณฑริก', 'ทัพ 3')
      .replace('กองทัพที่ 4 เกาโมทก', 'ทัพ 4');
  };

  const colors = [
    '#fbbf24', // มหาเสือ (gold)
    '#a855f7', // ธรณิน (purple)
    '#71717a', // อาทมาต (zinc)
    '#f97316', // ตำรวจหลวง (orange)
    '#94a3b8', // ทัพ 1 (slate)
    '#f43f5e', // ทัพ 2 (rose)
    '#8b5cf6', // ทัพ 3 (violet)
    '#0ea5e9'  // ทัพ 4 (sky)
  ];

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center w-full">
      {/* SVG Donut */}
      <div className="relative w-40 h-40 flex-shrink-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full select-none transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth={strokeWidth}
          />

          {total === 0 ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
            />
          ) : (
            data.map((d, idx) => {
              const percent = d.count / total;
              const strokeLength = percent * circumference;
              const strokeOffset = circumference - (accumulatedPercent * circumference);
              accumulatedPercent += percent;
              const color = colors[idx] || '#00f0ff';

              return (
                <circle
                  key={d.name}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out hover:opacity-85"
                  style={{ filter: `drop-shadow(0 0 3px ${color}33)` }}
                />
              );
            })
          )}
        </svg>

        {/* Centered Total Count */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-text-secondary text-[9px] uppercase font-bold tracking-wider">กำลังพลรวม</span>
          <span className="text-xl font-mono font-black text-text-primary mt-0.5">{total}</span>
          <span className="text-text-secondary text-[9px]">นาย</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-medium w-full max-w-[280px]">
        {data.map((d, idx) => {
          const color = colors[idx] || '#00f0ff';
          const percent = total > 0 ? ((d.count / total) * 100).toFixed(0) : '0';
          return (
            <div key={d.name} className="flex items-center justify-between border-b border-white/5 pb-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                <span className="text-text-secondary truncate text-[10px]">{getShortName(d.name)}</span>
              </div>
              <span className="font-mono text-text-primary text-[10px] font-bold">
                {d.count} <span className="text-[8px] text-text-secondary font-normal">({percent}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [topIncreases, setTopIncreases] = useState<(TopIncrease | null)[]>(
    Array(8).fill(null)
  );
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [division, setDivision] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [topLoading, setTopLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Import sessions delta history state
  const [importSessions, setImportSessions] = useState<ImportSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ImportSession | null>(null);
  const [sessionLogs, setSessionLogs] = useState<ImportLog[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionLogsLoading, setSessionLogsLoading] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');

  // Reset & Rollback states
  const [isResetting, setIsResetting] = useState(false);
  const [rollingBackSessionId, setRollingBackSessionId] = useState<string | null>(null);

  const handleDeletePlayer = async (player: Player) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้เล่น "${player.player_name}" ออกจากระบบ? การดำเนินการนี้ไม่สามารถย้อนกลับได้`)) {
      setIsDeleting(true);
      try {
        const res = await fetch(`/api/players/${player.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'ลบผู้เล่นไม่สำเร็จ');
        }
        alert('ลบผู้เล่นเรียบร้อยแล้ว!');
        fetchPlayers();
        fetchTopIncreases();
        fetchLogs();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบผู้เล่น');
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
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'ล้างฐานข้อมูลไม่สำเร็จ');
      }
      alert('ล้างฐานข้อมูลสำเร็จเรียบร้อยแล้ว!');
      fetchPlayers();
      fetchTopIncreases();
      fetchLogs();
      fetchImportSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการล้างฐานข้อมูล');
    } finally {
      setIsResetting(false);
    }
  };

  const handleRollbackSession = async (session: ImportSession) => {
    const confirmMsg = `ต้องการย้อนกลับ (Rollback) เซสชันการนำเข้าไฟล์ "${session.filename}" ใช่หรือไม่?\nการดำเนินการนี้จะลบผู้เล่นใหม่ที่สร้างขึ้นจากไฟล์นี้ และย้อนคะแนนของทหารทุกคนกลับเป็นค่าก่อนการอัปโหลดไฟล์นี้!`;
    if (!confirm(confirmMsg)) return;

    setRollingBackSessionId(session.id);
    try {
      const res = await fetch(`/api/admin/imports/${session.id}/rollback`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'ย้อนกลับเซสชันไม่สำเร็จ');
      }
      alert('ย้อนกลับข้อมูลในเซสชันนี้สำเร็จเรียบร้อยแล้ว!');
      setSelectedSession(null);
      setSessionLogs([]);
      fetchPlayers();
      fetchTopIncreases();
      fetchLogs();
      fetchImportSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการย้อนกลับ');
    } finally {
      setRollingBackSessionId(null);
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
    try {
      const res = await fetch('/api/admin/top-increases');
      const json = await res.json();
      const items = json.data || [];
      if (Array.isArray(items)) {
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
        items.forEach((item: TopIncrease) => {
          const idx = divisionNames.indexOf(item.division as unknown as string);
          if (idx !== -1) {
            mapped[idx] = item;
          }
        });
        setTopIncreases(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch top increases:', err);
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
    fetchImportSessions();
  }, [fetchPlayers, fetchTopIncreases, fetchLogs, fetchImportSessions]);

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
    'กองทัพธรณินพิทักษ์': 'text-violet-400',
    'กองทัพมหาเสือพิทักษ์': 'text-amber-500',
    'กองทัพอาทมาต': 'text-zinc-400',
    'กองพระตำรวจหลวง': 'text-amber-500',
    'กองทัพที่ 1 ปัญจะซันยะ': 'text-slate-300',
    'กองทัพที่ 2 วัชรนาถ': 'text-rose-400',
    'กองทัพที่ 3 ปุณฑริก': 'text-violet-400',
    'กองทัพที่ 4 เกาโมทก': 'text-sky-400',
  };

  // PART 2: Calculate Global Analytics Center values
  const divisionNamesList = [
    'กองทัพมหาเสือพิทักษ์',
    'กองทัพธรณินพิทักษ์',
    'กองทัพอาทมาต',
    'กองพระตำรวจหลวง',
    'กองทัพที่ 1 ปัญจะซันยะ',
    'กองทัพที่ 2 วัชรนาถ',
    'กองทัพที่ 3 ปุณฑริก',
    'กองทัพที่ 4 เกาโมทก'
  ];

  const divStats = divisionNamesList.map((name) => {
    const divPlayers = allPlayers.filter((p) => p.division === name);
    const totalScore = divPlayers.reduce((sum, p) => sum + p.total_score, 0);
    const count = divPlayers.length;
    return { name, totalScore, count };
  });

  const maxDivScore = Math.max(...divStats.map((d) => d.totalScore), 1);
  const supremeDiv = [...divStats].sort((a, b) => b.totalScore - a.totalScore)[0];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyPoints = logs
    .filter((log) => new Date(log.updated_at) >= sevenDaysAgo)
    .reduce((sum, log) => sum + Math.abs(log.score_diff), 0);

  // Compute guardsmen rank distribution counts
  const officersCount = allPlayers.filter((p) => {
    const pos = p.position || '';
    return pos.startsWith('ปลัดราชวัลลภ') || pos === 'พระยามหาเสือ' || pos === 'พระยาอัครอารักษ์' || pos === 'พระยาอาทมาตราชภักดี';
  }).length;

  const battalionCount = allPlayers.filter((p) => {
    const pos = p.position || '';
    return pos.startsWith('นายพันเวร') || pos.startsWith('นายกองเวร');
  }).length;

  const platoonCount = allPlayers.filter((p) => {
    const pos = p.position || '';
    return pos.startsWith('นายหมวดเวร') || pos.startsWith('นายหมู่เวร') || pos.startsWith('ครูฝึก');
  }).length;

  const soldiersCount = allPlayers.filter((p) => {
    const pos = p.position || '';
    return pos.startsWith('พลทหาร') || pos.startsWith('พลอาสาสมัคร') || pos === 'ทหารเสือประจำพระองค์' || pos === 'ทหารธรณินพิทักษ์' || pos === 'หมื่นอาทมาต';
  }).length;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6">
      {/* Navigation */}
      <AdminNav />

      {/* Part 2: Command Analytics Dashboard */}
      <section className="mb-10 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-gold/15 shadow-[0_0_10px_rgba(212,175,55,0.1)]">
            <svg className="h-4 w-4 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-primary">ศูนย์วิเคราะห์บัญชาการรบ (Command Analytics)</h2>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Total Forces */}
          <div className="glass-card glow-royal p-5 border-accent-gold/20 flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">จำนวนกำลังรบทั้งหมด</p>
              <p className="font-mono text-3xl font-black text-accent-gold mt-2">
                {allPlayers.length.toLocaleString()} <span className="text-base font-semibold text-text-secondary">นาย</span>
              </p>
            </div>
            <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-accent-gold rounded-full w-full opacity-60 shadow-[0_0_8px_#d4af37]" />
            </div>
          </div>

          {/* Card 2: Strongest Division */}
          <div className="glass-card glow-royal p-5 border-accent-gold/20 flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">กองทัพแต้มรบสะสมสูงสุด</p>
              <p className="text-base font-black text-text-primary truncate mt-2">
                {supremeDiv && supremeDiv.totalScore > 0 ? supremeDiv.name : 'ไม่มีข้อมูล'}
              </p>
            </div>
            <p className="font-mono text-xs text-accent-gold mt-2">
              คะแนนสะสมรวม: {supremeDiv && supremeDiv.totalScore > 0 ? supremeDiv.totalScore.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : 0} แต้ม
            </p>
          </div>

          {/* Card 3: Weekly Active Points */}
          <div className="glass-card glow-royal p-5 border-accent-gold/20 flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">ยอดแต้มรบเคลื่อนไหว (7 วันล่าสุด)</p>
              <p className="font-mono text-3xl font-black text-green-400 mt-2">
                +{weeklyPoints.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-base font-semibold text-text-secondary">แต้ม</span>
              </p>
            </div>
            <p className="text-[10px] text-text-secondary mt-2">
              คำนวณจากประวัติการแจกแต้มกิจกรรมการทำงาน
            </p>
          </div>
        </div>

        {/* Division Power & Rank Distribution Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Progress Bars Card */}
          <div className="glass-card p-6 border-white/5">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-5 pb-2 border-b border-white/5 flex items-center gap-2">
              <span>📊</span> พละกำลังและอัตรากำลังพลของ 8 กองทัพ
            </h3>
            <div className="space-y-4.5">
              {divStats.map((d) => {
                const pct = maxDivScore > 0 ? (d.totalScore / maxDivScore) * 100 : 0;
                const accentColor = divisionColors[d.name] || 'text-text-secondary';
                const barColor = d.name === 'กองทัพมหาเสือพิทักษ์' || d.name === 'กองพระตำรวจหลวง' ? 'bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.3)]' :
                                 d.name === 'กองทัพธรณินพิทักษ์' || d.name === 'กองทัพที่ 3 ปุณฑริก' ? 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]' :
                                 d.name === 'กองทัพอาทมาต' ? 'bg-zinc-500 shadow-[0_0_8px_rgba(113,113,122,0.3)]' :
                                 d.name === 'กองทัพที่ 1 ปัญจะซันยะ' ? 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.3)]' :
                                 d.name === 'กองทัพที่ 2 วัชรนาถ' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]' :
                                 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.3)]';

                return (
                  <div key={d.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${accentColor}`}>{d.name}</span>
                      <span className="font-mono text-text-secondary font-medium">
                        {d.count} นาย • {d.totalScore.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} แต้ม
                      </span>
                    </div>
                    <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rank Distribution Card */}
          <div className="glass-card p-6 border-white/5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-5 pb-2 border-b border-white/5 flex items-center gap-2">
                <span>🎖️</span> สัดส่วนยอดกำลังพลแยกตามชั้นยศ
              </h3>
              <div className="space-y-4 font-sans text-sm">
                {/* Commanders */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-accent-gold/10 bg-accent-gold/5 hover:bg-accent-gold/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">👑</span>
                    <div>
                      <p className="font-bold text-accent-gold text-xs uppercase tracking-wider">ระดับผู้บัญชาการอาวุโส</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">พระยา / ปลัดราชวัลลภ</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-accent-gold-glowing text-lg">
                    {officersCount} <span className="text-xs font-normal text-text-secondary">นาย</span>
                  </span>
                </div>

                {/* Captains */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">⚔️</span>
                    <div>
                      <p className="font-bold text-text-primary text-xs uppercase tracking-wider">ระดับหัวหน้านายทหาร</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">นายพันเวร / นายกองเวร</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-text-primary text-lg">
                    {battalionCount} <span className="text-xs font-normal text-text-secondary">นาย</span>
                  </span>
                </div>

                {/* Lieutenants */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🛡️</span>
                    <div>
                      <p className="font-bold text-text-primary text-xs uppercase tracking-wider">ระดับนายทหารผู้คุมหมวด</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">นายหมวดเวร / นายหมู่เวร / ครูฝึก</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-text-primary text-lg">
                    {platoonCount} <span className="text-xs font-normal text-text-secondary">นาย</span>
                  </span>
                </div>

                {/* Foot soldiers */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">💂</span>
                    <div>
                      <p className="font-bold text-text-primary text-xs uppercase tracking-wider">ระดับกำลังพลหลัก</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">พลทหารยามอาวุโส / พลทหารยาม / พลอาสา / ทหารกองพิเศษ</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-text-primary text-lg">
                    {soldiersCount} <span className="text-xs font-normal text-text-secondary">นาย</span>
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-text-secondary/40 text-center mt-4">
              คำนวณแยกตามชื่อยศปัจจุบันที่มีอยู่ในฐานข้อมูลระบบทำเนียบล่าสุด
            </p>
          </div>
        </div>

        {/* SVG charts: Total scores bar chart and headcount donut chart */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
          {/* Bar Chart Card */}
          <div className="glass-card p-6 border-white/5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-5 pb-2 border-b border-white/5 flex items-center gap-2">
                <span>📈</span> สถิติเปรียบเทียบแต้มสะสมรวมแยกตามกองทัพ
              </h3>
              <div className="py-2">
                <DivisionBarChart data={divStats} />
              </div>
            </div>
            <p className="text-[10px] text-text-secondary/40 text-center mt-4">
              แสดงพละกำลังรบสะสมจำแนกตามผลรวมคะแนนทุกนายในแต่ละสังกัด
            </p>
          </div>

          {/* Donut Chart Card */}
          <div className="glass-card p-6 border-white/5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-5 pb-2 border-b border-white/5 flex items-center gap-2">
                <span>🍩</span> สัดส่วนยอดอัตรากำลังพลแต่ละกองทัพ
              </h3>
              <div className="py-2 flex justify-center">
                <DivisionDonutChart data={divStats} />
              </div>
            </div>
            <p className="text-[10px] text-text-secondary/40 text-center mt-4">
              คำนวณสัดส่วนประชากรทหารรักษาพระองค์ที่มีรายชื่อในทำเนียบ
            </p>
          </div>
        </div>
      </section>

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
      <section className="mb-10 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        {/* Header with Export Excel Button */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-purple/15">
              <svg className="h-4 w-4 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-primary">จัดการผู้เล่น</h2>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-mono text-text-secondary">
              {filteredPlayers.length} ผู้เล่น
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-accent-gold/20 bg-accent-gold/5
                px-4 py-2 text-xs font-bold text-accent-gold tracking-wider uppercase
                transition-all duration-300 hover:border-accent-gold/50 hover:bg-accent-gold/10
                hover:shadow-[0_0_15px_rgba(212,175,55,0.1)] cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              💾 ดาวน์โหลดสำรองข้อมูลทำเนียบ Excel
            </button>

            {/* Reset Database Button */}
            <button
              onClick={handleResetDatabase}
              disabled={isResetting}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5
                px-4 py-2 text-xs font-bold text-red-400 tracking-wider uppercase
                transition-all duration-300 hover:border-red-500/50 hover:bg-red-500/10
                hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] cursor-pointer disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {isResetting ? 'กำลังล้าง...' : '🚨 ล้างฐานข้อมูลทหารทั้งหมด'}
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-4 space-y-3">
          <SearchBar value={search} onChange={setSearch} />
          <DivisionFilter value={division} onChange={handleDivisionChange} />
        </div>

        {/* Players Table */}
        {loading ? (
          <LoadingSpinner />
        ) : filteredPlayers.length === 0 ? (
          <div className="glass-card flex flex-col items-center py-12">
            <p className="text-text-secondary">ไม่พบผู้เล่น</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-text-secondary uppercase">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-text-secondary uppercase">
                      ชื่อผู้เล่น
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-text-secondary uppercase">
                      ตำแหน่ง
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-text-secondary uppercase">
                      กอง
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider text-text-secondary uppercase">
                      คะแนนรวม
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider text-text-secondary uppercase">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player, index) => {
                    const displayPosition = getDisplayPosition(player.position, player.total_score, player.division);

                      return (
                        <tr
                          key={player.id}
                          className="player-row border-b border-white/5"
                        >
                          <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 font-medium text-text-primary">
                            {player.player_name}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-text-secondary">
                            <span className={(displayPosition?.startsWith('ปลัดราชวัลลภ') || displayPosition === 'พระยามหาเสือ' || displayPosition === 'พระยาอัครอารักษ์' || displayPosition === 'พระยาอาทมาตราชภักดี') ? 'text-accent-gold-glowing font-bold' : ''}>
                              {displayPosition}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${divisionColors[player.division] || 'text-text-secondary'}`}>
                              {player.division}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-accent-cyan flex items-center gap-1.5 justify-end">
                                {player.total_score.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                {player.latest_change !== undefined && player.latest_change !== 0 && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                                    player.latest_change > 0 
                                      ? 'text-green-400 bg-green-500/10 border-green-500/20' 
                                      : 'text-red-400 bg-red-500/10 border-red-500/20'
                                  }`}>
                                    {player.latest_change > 0 ? '+' : ''}{player.latest_change.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-text-secondary mt-0.5">
                                เริ่มแรก: {player.starting_score !== undefined ? player.starting_score.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : player.total_score.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditPlayer(player)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10
                                bg-white/5 px-2.5 py-1.5 text-xs font-medium text-text-secondary
                                transition-all hover:border-accent-cyan/30 hover:text-accent-cyan
                                hover:shadow-[0_0_10px_rgba(0,240,255,0.1)] cursor-pointer"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              แก้ไข
                            </button>
                            <button
                              onClick={() => handleDeletePlayer(player)}
                              disabled={isDeleting}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/10
                                bg-red-500/5 px-2.5 py-1.5 text-xs font-medium text-red-400
                                transition-all hover:border-red-500/30 hover:bg-red-500/10
                                hover:shadow-[0_0_10px_rgba(239,68,68,0.1)] cursor-pointer disabled:opacity-50"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              ลบ
                            </button>
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

      {/* Section 3: CSV Import */}
      <section className="mb-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-gold/15">
            <svg className="h-4 w-4 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-primary">นำเข้าข้อมูล</h2>
        </div>

        <CsvImporter onImportComplete={handleImportComplete} />
      </section>

      {/* Section 4: Individual Import Delta History */}
      <section className="mb-10 animate-slide-up" style={{ animationDelay: '0.22s' }}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-cyan/15 shadow-[0_0_10px_rgba(0,240,255,0.1)]">
            <svg className="h-4 w-4 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-primary">ประวัติแต้มรายบุคคลจากไฟล์ (Import Delta History)</h2>
          <span className="ml-auto rounded-full bg-white/5 px-3 py-1 text-xs font-mono text-text-secondary">
            ระบบเซสชัน
          </span>
        </div>

        {sessionsLoading ? (
          <LoadingSpinner />
        ) : importSessions.length === 0 ? (
          <div className="glass-card flex flex-col items-center py-12">
            <p className="text-text-secondary">ยังไม่มีข้อมูลประวัติการนำเข้าไฟล์ในระบบ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Import Sessions List */}
            <div className="lg:col-span-5 space-y-3 max-h-[500px] overflow-y-auto pr-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-text-secondary mb-2">เลือกประวัติการนำเข้าไฟล์</p>
              {importSessions.map((session) => {
                const isSelected = selectedSession?.id === session.id;
                const formattedDate = new Date(session.created_at).toLocaleString('th-TH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-accent-gold bg-accent-gold/5 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                        : 'border-white/5 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-12 h-12 bg-accent-gold/10 rounded-bl-full flex items-center justify-center">
                        <span className="text-accent-gold text-xs font-bold pl-3 pb-3">✓</span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <span className="text-lg">📁</span>
                      <div className="pr-4">
                        <p className={`font-bold text-sm truncate ${isSelected ? 'text-accent-gold' : 'text-text-primary'}`}>
                          {session.filename}
                        </p>
                        <p className="text-[10px] text-text-secondary mt-1">{formattedDate}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-mono font-semibold text-text-secondary border-t border-white/5 pt-2">
                      <span className="bg-green-500/10 text-green-400 border border-green-500/15 px-2 py-0.5 rounded">
                        เพิ่มใหม่: +{session.imported_count}
                      </span>
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 px-2 py-0.5 rounded">
                        ปรับปรุงแต้ม: {session.updated_count}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Individual Deltas in Selected Session */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div className="glass-card p-5 border-white/5 h-full flex flex-col">
                {selectedSession ? (
                  <>
                    {/* Header */}
                    <div className="mb-5 pb-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-accent-gold flex items-center gap-2">
                            <span>🔍</span> เจาะลึกรายชื่อทหารในไฟล์
                          </h3>
                          <p className="text-[10px] text-text-secondary mt-0.5 truncate max-w-[200px]">
                            ไฟล์: {selectedSession.filename}
                          </p>
                        </div>
                        
                        {/* Rollback Session Button */}
                        <button
                          onClick={() => handleRollbackSession(selectedSession)}
                          disabled={rollingBackSessionId === selectedSession.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5
                            px-2.5 py-1 text-[10px] font-bold text-red-400 uppercase tracking-wider
                            transition-all duration-300 hover:border-red-500/50 hover:bg-red-500/10
                            hover:shadow-[0_0_10px_rgba(239,68,68,0.1)] cursor-pointer disabled:opacity-50"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          {rollingBackSessionId === selectedSession.id ? 'กำลังย้อนกลับ...' : '↩️ ย้อนกลับไฟล์นี้'}
                        </button>
                      </div>
                      
                      {/* Search Input for individual in import */}
                      <div className="relative w-full sm:w-48">
                        <input
                          type="text"
                          value={sessionSearchQuery}
                          onChange={(e) => setSessionSearchQuery(e.target.value)}
                          placeholder="ค้นหารายชื่อทหาร..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-gold transition-colors font-sans pr-8"
                        />
                        <span className="absolute right-2.5 top-2 text-text-secondary text-xs">🔍</span>
                      </div>
                    </div>

                    {/* Table View */}
                    {sessionLogsLoading ? (
                      <div className="py-20 flex justify-center">
                        <LoadingSpinner />
                      </div>
                    ) : (() => {
                      const filteredLogs = sessionLogs.filter((log) =>
                        log.player_name.toLowerCase().includes(sessionSearchQuery.toLowerCase())
                      );

                      if (filteredLogs.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-20 text-center text-xs text-text-secondary">
                            <span>📭</span>
                            <p className="mt-2">ไม่พบรายชื่อทหารที่มีการเปลี่ยนแปลงแต้มตรงกับคำค้นหา</p>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-white/5 text-left text-text-secondary text-xs">
                                <th className="pb-2 text-xs font-semibold text-text-secondary">ชื่อทหาร</th>
                                <th className="pb-2 text-xs font-semibold text-text-secondary">กองทัพ</th>
                                <th className="pb-2 text-center text-xs font-semibold text-text-secondary">แต้มเดิม</th>
                                <th className="pb-2 text-center text-xs font-semibold text-text-secondary">การเปลี่ยนแปลง</th>
                                <th className="pb-2 text-right text-xs font-semibold text-text-secondary">แต้มใหม่</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredLogs.map((log) => {
                                const diffSign = log.score_diff > 0 ? '+' : '';
                                const diffColor = log.score_diff > 0 
                                  ? 'text-green-400 bg-green-500/10 border-green-500/20' 
                                  : log.score_diff < 0 
                                    ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                    : 'text-text-secondary bg-white/5 border-white/10';

                                return (
                                  <tr key={log.id} className="border-b border-white/5 text-xs hover:bg-white/[0.02] transition-colors">
                                    <td className="py-2.5 font-medium text-text-primary">{log.player_name}</td>
                                    <td className="py-2.5">
                                      <span className={`font-semibold ${divisionColors[log.division] || 'text-text-secondary'}`}>
                                        {log.division.replace('กองทัพที่ ', 'ทัพ ')}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-center font-mono text-text-secondary">
                                      {log.old_score}
                                    </td>
                                    <td className="py-2.5 text-center">
                                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold font-mono border ${diffColor}`}>
                                        {diffSign}{log.score_diff}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-right font-mono font-bold text-accent-gold">
                                      {log.new_score}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-xs text-text-secondary">
                    <span>👈</span>
                    <p className="mt-2">โปรดเลือกประวัติการนำเข้าไฟล์ด้านซ้ายเพื่อดูสถิติเจาะลึกรายบุคคล</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Part 3: Section 4 - Admin Audit Logs */}
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

        {logsLoading ? (
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
