import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import type { ApiResponse, ScoreHistory } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: 'Player ID is required.' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    // Query score history entries for this player, sorted chronologically
    const { data: history, error } = await supabase
      .from('score_history')
      .select('*')
      .eq('player_id', id)
      .order('updated_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch player score history:', error);
      return NextResponse.json(
        { error: `ล้มเหลวในการดึงประวัติแต้มสะสม: ${error.message}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: history as ScoreHistory[]
    } satisfies ApiResponse<ScoreHistory[]>);
  } catch (err) {
    console.error('Unexpected error in GET /api/players/[id]/history:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
