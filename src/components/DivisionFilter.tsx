'use client';

interface DivisionFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const divisions = [
  { value: '', label: 'ทุกกรมกอง', color: 'bg-accent-gold' },
  { value: 'คณะผู้บริหาร', label: 'คณะผู้บริหาร', color: 'bg-purple-600 shadow-[0_0_10px_#a855f7]' },
  { value: 'กองทัพมหาเสือพิทักษ์', label: 'กองทัพมหาเสือพิทักษ์', color: 'bg-amber-600' },
  { value: 'กองทัพธรณินพิทักษ์', label: 'กองทัพธรณินพิทักษ์', color: 'bg-violet-500' },
  { value: 'กองทัพอาทมาต', label: 'กองทัพอาทมาต', color: 'bg-zinc-500' },
  { value: 'กองพระตำรวจหลวง', label: 'กองพระตำรวจหลวง', color: 'bg-amber-600' },
  { value: 'กองทัพที่ 1 ปัญจะซันยะ', label: 'กองทัพที่ 1 ปัญจะซันยะ', color: 'bg-slate-400' },
  { value: 'กองทัพที่ 2 วัชรนาถ', label: 'กองทัพที่ 2 วัชรนาถ', color: 'bg-rose-500' },
  { value: 'กองทัพที่ 3 ปุณฑริก', label: 'กองทัพที่ 3 ปุณฑริก', color: 'bg-violet-500' },
  { value: 'กองทัพที่ 4 เกาโมทก', label: 'กองทัพที่ 4 เกาโมทก', color: 'bg-sky-400' },
];

export default function DivisionFilter({ value, onChange }: DivisionFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
      {divisions.map((div) => {
        const isActive = value === div.value;
        return (
          <button
            key={div.value}
            onClick={() => onChange(div.value)}
            className={`glass-card flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase
              transition-all duration-300 hover:scale-105 border border-white/5 cursor-pointer
              ${
                isActive
                  ? 'border-accent-gold/50 text-accent-gold shadow-[0_0_15px_rgba(212,175,55,0.18)] bg-accent-crimson/10'
                  : 'text-text-secondary hover:text-text-primary hover:border-white/15'
              }`}
          >
            {/* Color indicator dot */}
            <span
              className={`h-2 w-2 rounded-full ${div.color} ${
                isActive ? 'animate-pulse-glow shadow-[0_0_8px_currentColor]' : 'opacity-60'
              }`}
            />
            {div.label}
          </button>
        );
      })}
    </div>
  );
}
