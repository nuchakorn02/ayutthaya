import React from 'react';
import { Player } from '@/lib/types';
import { DivisionBarChart, DivisionDonutChart } from '@/components/admin/AdminCharts';

interface AdminDashboardProps {
  allPlayers: Player[];
  weeklyPoints: number;
}

export default function AdminDashboard({ allPlayers, weeklyPoints }: AdminDashboardProps) {
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

  const countByRank = {
    guard: allPlayers.filter(p => (p.position || '').includes('องครักษ์') || (p.position || '').includes('มหาดเล็ก')).length,
    police: allPlayers.filter(p => (p.position || '').includes('ตำรวจ')).length,
    captain: allPlayers.filter(p => (p.position || '').includes('นายกอง') || (p.position || '').includes('ผู้บังคับ')).length,
    lieutenant: allPlayers.filter(p => (p.position || '').includes('นายหมวด') || (p.position || '').includes('หัวหน้า')).length,
    soldier: allPlayers.filter(p => !(p.position || '').includes('องครักษ์') && !(p.position || '').includes('มหาดเล็ก') && !(p.position || '').includes('ตำรวจ') && !(p.position || '').includes('นายกอง') && !(p.position || '').includes('นายหมวด') && !(p.position || '').includes('ผู้บังคับ') && !(p.position || '').includes('หัวหน้า')).length
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

  return (
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
            <p className="text-xs text-text-secondary uppercase tracking-widest mb-1">ยอดกำลังพลทั้งหมด</p>
            <h3 className="text-3xl font-black text-text-primary">
              {allPlayers.filter(p => p.division !== 'คณะผู้บริหาร').length} <span className="text-sm font-medium text-text-secondary">นาย</span>
            </h3>
          </div>
          <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-accent-gold w-[100%] shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
          </div>
        </div>
        
        {/* Card 2: Strongest Division */}
        <div className="glass-card glow-cyan p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-widest mb-1">กองทัพที่แข็งแกร่งที่สุด</p>
            <h3 className="text-xl font-black text-accent-gold truncate">
              {supremeDiv && supremeDiv.totalScore > 0 ? supremeDiv.name : 'ยังไม่มีข้อมูล'}
            </h3>
          </div>
          <p className="text-sm mt-3 font-mono text-text-primary flex items-center gap-2 border-t border-white/10 pt-3">
            คะแนนรวม: {supremeDiv && supremeDiv.totalScore > 0 ? supremeDiv.totalScore.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : 0} แต้ม
          </p>
        </div>

        {/* Card 3: Weekly Active Points */}
        <div className="glass-card glow-emerald p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-widest mb-1">แต้มความเคลื่อนไหว (7 วัน)</p>
            <h3 className="text-3xl font-black text-green-400">
              +{weeklyPoints.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[10px] text-text-secondary mt-3 italic border-t border-white/10 pt-3">
            ผลรวมแต้มที่เพิ่มขึ้นของกำลังพลใน 7 วันล่าสุด
          </p>
        </div>
      </div>

      {/* Division Power & Rank Distribution Grid */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progress Bars Card */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-text-primary mb-5 flex items-center gap-2">
            <span>⚔️</span> เปรียบเทียบแสนยานุภาพ (คะแนนสะสม)
          </h3>
          <div className="space-y-4">
            {divStats.map((d) => {
              const pct = maxDivScore > 0 ? (d.totalScore / maxDivScore) * 100 : 0;
              const colorClass = divisionColors[d.name] || 'text-white';
              const bgColorClass = colorClass.replace('text-', 'bg-');
              
              return (
                <div key={d.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary truncate pr-2">{d.name}</span>
                    <span className="font-mono font-bold text-text-primary">
                      {d.totalScore.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${bgColorClass} transition-all duration-1000 ease-out`} 
                      style={{ width: `${pct}%`, opacity: 0.8 }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rank Distribution Card */}
        <div className="glass-card p-5 flex flex-col">
          <h3 className="text-sm font-bold text-text-primary mb-5 flex items-center gap-2">
            <span>🎖️</span> สัดส่วนชั้นยศรักษาพระองค์
          </h3>
          
          <div className="flex-1 grid grid-cols-2 gap-3">
            {/* Commanders */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
              <div className="h-10 w-10 rounded-full bg-accent-gold/20 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                👑
              </div>
              <div>
                <p className="text-xl font-black text-text-primary">{countByRank.guard + countByRank.police}</p>
                <p className="text-[10px] text-accent-gold">องครักษ์/ตำรวจ</p>
              </div>
            </div>
            
            {/* Captains */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
              <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                ⚔️
              </div>
              <div>
                <p className="text-xl font-black text-text-primary">{countByRank.captain}</p>
                <p className="text-[10px] text-rose-400">ผู้บังคับ/นายกอง</p>
              </div>
            </div>
            
            {/* Lieutenants */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
              <div className="h-10 w-10 rounded-full bg-sky-500/20 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(14,165,233,0.2)]">
                🛡️
              </div>
              <div>
                <p className="text-xl font-black text-text-primary">{countByRank.lieutenant}</p>
                <p className="text-[10px] text-sky-400">หัวหน้า/นายหมวด</p>
              </div>
            </div>
            
            {/* Foot soldiers */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors">
              <div className="h-10 w-10 rounded-full bg-slate-500/20 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(100,116,139,0.2)]">
                🪖
              </div>
              <div>
                <p className="text-xl font-black text-text-primary">{countByRank.soldier}</p>
                <p className="text-[10px] text-slate-400">กำลังพลทั่วไป</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SVG charts: Total scores bar chart and headcount donut chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart Card */}
        <div className="glass-card p-5">
          <div className="flex flex-col h-full justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary mb-1 flex items-center gap-2">
                <span>📊</span> คะแนนรวมแยกตามกองทัพ
              </h3>
              <div className="py-2">
                <DivisionBarChart data={divStats} />
              </div>
            </div>
            <p className="text-[10px] text-text-secondary/40 text-center mt-2">
              กราฟแสดงคะแนนรวม (Total Score) ของแต่ละกองทัพในปัจจุบัน
            </p>
          </div>
        </div>

        {/* Donut Chart Card */}
        <div className="glass-card p-5">
          <div className="flex flex-col h-full justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary mb-1 flex items-center gap-2">
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
      </div>
    </section>
  );
}
