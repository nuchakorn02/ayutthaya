import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/lib/types';

interface AuditLogResponse {
  id: string;
  old_score: number;
  new_score: number;
  score_diff: number;
  reason: string | null;
  updated_at: string;
  players: {
    player_name: string;
    division: string;
  } | null;
}



export async function GET(request: NextRequest) {
  try {
    

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since'); // e.g. "7d", "30d"

    const adminClient = createAdminClient();

    let query = adminClient
      .from('score_history')
      .select('id, old_score, new_score, score_diff, reason, updated_at, players(player_name, division)')
      .order('updated_at', { ascending: false });

    if (since) {
      // Parse "7d" → cut off date
      const match = since.match(/^(\d+)d$/);
      if (match) {
        const days = parseInt(match[1], 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        // ไม่มี .limit() — ดึงทุก entry ใน window นี้
        query = query.gte('updated_at', cutoff.toISOString());
      } else {
        query = query.limit(30);
      }
    } else {
      // Default: แค่ 30 รายการล่าสุด สำหรับตาราง audit log
      query = query.limit(30);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('Failed to query score history logs:', logsError);
      return NextResponse.json(
        { error: `ล้มเหลวในการดึงข้อมูลประวัติกิจกรรม: ${logsError.message}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: logs as unknown as AuditLogResponse[]
    } satisfies ApiResponse<AuditLogResponse[]>);
  } catch (err) {
    console.error('Unexpected error in GET /api/admin/logs:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
