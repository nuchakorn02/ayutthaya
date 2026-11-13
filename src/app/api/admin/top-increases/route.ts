import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getActivePlayersOutcome } from '@/lib/topIncreases.mjs';
import { RETIRED_SCORE } from '@/lib/constants.mjs';
import type { TopIncrease, ApiResponse } from '@/lib/types';

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // ดึงเฉพาะ score_history ล่าสุดของแต่ละ player
    // โดยกรอง player ที่ยังอยู่ในระบบก่อน แล้วค่อย join history
    const { data: activePlayers, error: playersError } = await adminClient
      .from('players')
      .select('id, player_name, division')
      .neq('division', 'ปลดประจำการ')
      .neq('total_score', RETIRED_SCORE);

    const activePlayersOutcome = getActivePlayersOutcome(activePlayers, playersError);

    if (activePlayersOutcome.kind === 'error') {
      console.error('Active players query error:', activePlayersOutcome.message);
      return NextResponse.json(
        { error: 'Failed to fetch active players.' } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    if (activePlayersOutcome.kind === 'empty') {
      return NextResponse.json({ data: [] } satisfies ApiResponse<TopIncrease[]>);
    }

    const activePlayerIds = activePlayersOutcome.players.map((p) => p.id);

    // ดึงเฉพาะ score_history ของ active players เรียงจากใหม่ไปเก่า
    const { data: allHistory, error: historyError } = await adminClient
      .from('score_history')
      .select('player_id, score_diff, updated_at')
      .in('player_id', activePlayerIds)
      .order('updated_at', { ascending: false });


    if (historyError) {
      console.error('Score history query error:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch score history.' } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    if (!allHistory || allHistory.length === 0) {
      return NextResponse.json({ data: [] } satisfies ApiResponse<TopIncrease[]>);
    }

    // หา score_diff ล่าสุดของแต่ละ player (ดึงแค่ entry แรกของแต่ละ player_id)
    const latestChangeMap = new Map<string, { scoreDiff: number; lastUpdated: string }>();
    for (const h of allHistory) {
      if (!latestChangeMap.has(h.player_id)) {
        latestChangeMap.set(h.player_id, {
          scoreDiff: h.score_diff,
          lastUpdated: h.updated_at,
        });
      }
    }

    // กรองเฉพาะ player ที่มี score_diff > 0
    const playerIdsWithIncrease = Array.from(latestChangeMap.entries())
      .filter(([, v]) => v.scoreDiff > 0)
      .map(([id]) => id);

    if (playerIdsWithIncrease.length === 0) {
      return NextResponse.json({ data: [] } satisfies ApiResponse<TopIncrease[]>);
    }

    // ใช้ activePlayers ที่ดึงมาแล้วด้านบน ไม่ต้อง query ซ้ำ
    const playerMap = new Map(activePlayersOutcome.players.map((p) => [p.id, p]));


    const divisions = [
      'กองทัพมหาเสือพิทักษ์',
      'กองทัพธรณินพิทักษ์',
      'กองทัพอาทมาต',
      'กองพระตำรวจหลวง',
      'กองทัพที่ 1 ปัญจะซันยะ',
      'กองทัพที่ 2 วัชรนาถ',
      'กองทัพที่ 3 ปุณฑริก',
      'กองทัพที่ 4 เกาโมทก',
    ];

    const topIncreases: TopIncrease[] = [];

    for (const division of divisions) {
      let bestId: string | null = null;
      let bestDiff = 0;

      for (const [playerId, change] of latestChangeMap.entries()) {
        const player = playerMap.get(playerId);
        if (!player || player.division !== division) continue;
        if (change.scoreDiff > bestDiff) {
          bestDiff = change.scoreDiff;
          bestId = playerId;
        }
      }

      if (bestId) {
        const player = playerMap.get(bestId)!;
        const change = latestChangeMap.get(bestId)!;
        topIncreases.push({
          player_name: player.player_name,
          division: player.division,
          score_increase: change.scoreDiff,
          last_updated: change.lastUpdated,
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
