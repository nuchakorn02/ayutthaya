import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import type { TopIncrease, ApiResponse } from '@/lib/types';

export async function GET() {
  try {
    // Calculate the date 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoISO = threeDaysAgo.toISOString();

    // Fetch score history from the last 3 days, joined with player info
    const { data: historyRecords, error: historyError } = await supabase
      .from('score_history')
      .select('player_id, score_diff, updated_at')
      .gte('updated_at', threeDaysAgoISO);

    if (historyError) {
      console.error('Score history query error:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch score history.' } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    if (!historyRecords || historyRecords.length === 0) {
      return NextResponse.json({ data: [] } satisfies ApiResponse<TopIncrease[]>);
    }

    // Aggregate score_diff per player
    const playerAggregates = new Map<
      string,
      { totalIncrease: number; lastUpdated: string }
    >();

    for (const record of historyRecords) {
      const existing = playerAggregates.get(record.player_id);
      if (existing) {
        existing.totalIncrease += record.score_diff;
        if (record.updated_at > existing.lastUpdated) {
          existing.lastUpdated = record.updated_at;
        }
      } else {
        playerAggregates.set(record.player_id, {
          totalIncrease: record.score_diff,
          lastUpdated: record.updated_at,
        });
      }
    }

    // Get unique player IDs that have positive increases
    const playerIds = Array.from(playerAggregates.entries())
      .filter(([, agg]) => agg.totalIncrease > 0)
      .map(([id]) => id);

    if (playerIds.length === 0) {
      return NextResponse.json({ data: [] } satisfies ApiResponse<TopIncrease[]>);
    }

    // Fetch player details
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, player_name, division')
      .in('id', playerIds);

    if (playersError) {
      console.error('Players query error:', playersError);
      return NextResponse.json(
        { error: 'Failed to fetch player details.' } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    if (!players) {
      return NextResponse.json({ data: [] } satisfies ApiResponse<TopIncrease[]>);
    }

    // Build a map of player details
    const playerMap = new Map(players.map((p) => [p.id, p]));

    // For each division, find the player with the highest total increase
    const topIncreases: TopIncrease[] = [];
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

    for (const division of divisions) {
      let bestPlayerId: string | null = null;
      let bestIncrease = 0;

      for (const [playerId, aggregate] of playerAggregates.entries()) {
        const player = playerMap.get(playerId);
        if (!player || player.division !== division) continue;
        if (aggregate.totalIncrease > bestIncrease) {
          bestIncrease = aggregate.totalIncrease;
          bestPlayerId = playerId;
        }
      }

      if (bestPlayerId) {
        const player = playerMap.get(bestPlayerId)!;
        const aggregate = playerAggregates.get(bestPlayerId)!;
        topIncreases.push({
          player_name: player.player_name,
          division: player.division,
          score_increase: aggregate.totalIncrease,
          last_updated: aggregate.lastUpdated,
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
