import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/lib/types';

interface AuditLogResponse {
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

function verifyAdmin(cookieStore: ReturnType<typeof cookies> extends Promise<infer T> ? T : never): boolean {
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expectedHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
  return token === expectedHash;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdmin(cookieStore)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' } satisfies ApiResponse<never>,
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Query latest 30 score changes joined with player name and division
    const { data: logs, error: logsError } = await adminClient
      .from('score_history')
      .select('id, old_score, new_score, score_diff, updated_at, players(player_name, division)')
      .order('updated_at', { ascending: false })
      .limit(30);

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
