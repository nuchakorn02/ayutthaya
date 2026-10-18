/**
 * Shared constants across the application (single source of truth).
 */

export const DIVISIONS = [
  'คณะผู้บริหาร',
  'กองทัพมหาเสือพิทักษ์',
  'กองทัพธรณินพิทักษ์',
  'กองทัพอาทมาต',
  'กองพระตำรวจหลวง',
  'กองทัพที่ 1 ปัญจะซันยะ',
  'กองทัพที่ 2 วัชรนาถ',
  'กองทัพที่ 3 ปุณฑริก',
  'กองทัพที่ 4 เกาโมทก'
] as const;

export type DivisionName = (typeof DIVISIONS)[number];

export const DIVISION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'คณะผู้บริหาร': { bg: 'bg-purple-600/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  'กองทัพธรณินพิทักษ์': { bg: 'bg-violet-600/15', text: 'text-violet-400', border: 'border-violet-500/30' },
  'กองทัพมหาเสือพิทักษ์': { bg: 'bg-amber-800/15', text: 'text-amber-500', border: 'border-amber-700/30 shadow-[0_0_8px_rgba(217,119,6,0.15)]' },
  'กองทัพอาทมาต': { bg: 'bg-zinc-800/20', text: 'text-zinc-400', border: 'border-zinc-700/30' },
  'กองพระตำรวจหลวง': { bg: 'bg-amber-800/15', text: 'text-amber-500', border: 'border-amber-700/30 shadow-[0_0_8px_rgba(217,119,6,0.15)]' },
  'กองทัพที่ 1 ปัญจะซันยะ': { bg: 'bg-slate-400/15', text: 'text-slate-300', border: 'border-slate-500/30' },
  'กองทัพที่ 2 วัชรนาถ': { bg: 'bg-rose-600/15', text: 'text-rose-400', border: 'border-rose-500/30 shadow-[0_0_8px_rgba(225,29,72,0.15)]' },
  'กองทัพที่ 3 ปุณฑริก': { bg: 'bg-emerald-600/15', text: 'text-emerald-400', border: 'border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]' },
  'กองทัพที่ 4 เกาโมทก': { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30 shadow-[0_0_8px_rgba(14,165,233,0.15)]' },
};
