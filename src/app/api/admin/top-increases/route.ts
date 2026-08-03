import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { TopIncrease, ApiResponse } from '@/lib/types';

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // ดึง players ทุกคนที่ latest_change > 0 และไม่ใช่ปลดประจำการ
    // ใช้ latest_change จาก players table โดยตรง — ไม่ต้องพึ่ง time window ของ score_history
    const { data: players, error: playersError } = await adminClient
      .from('players')
      .select('id, player_name, division, latest_change, total_score')
      .neq('division', 'ปลดประจำการ')
      .neq('total_score', -999)
      .gt('latest_change', 0)
      .order('latest_change', { ascending: false });

    if (playersError) {
      console.error('Players query error:', playersError);
      return NextResponse.json(
        { error: 'Failed to fetch players.' } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ data: [] } satisfies ApiResponse<TopIncrease[]>);
    }

    const divisions = [
      'กองทัพมหาเสือพิทักษ์',
      'กองทัพธรณินพิทักษ์',
      'กองทัพอาทมาต',
      'กองพระตำรวจหลวง',
      'กองทัพที่ 1 ปัญจะซันยะ',
      'กองทัพที่ 2 วัชรนาถ',
      'กองทัพที่ 3 ปุณฑริก',
      'กองทัพที่ 4 เกาโมทก'
    ];

    // หาคนที่ทำแต้มสูงสุดในแต่ละกองทัพ (players ถูกเรียง latest_change DESC แล้ว)
    const topIncreases: TopIncrease[] = [];
    for (const division of divisions) {
      const best = players.find(p => p.division === division);
      if (best) {
        topIncreases.push({
          player_name: best.player_name,
          division: best.division,
          score_increase: best.latest_change ?? 0,
          last_updated: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ data: topIncreases } satisfies ApiResponse<TopIncrease[]>);
  } catch (err) {
    console.error('Unexpected error in GET /api/admin/top-increases:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
