import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/server';
import type { Player, ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division');
    const search = searchParams.get('search');

    let query = supabase.from('players').select('*');

    if (division) {
      query = query.eq('division', division).order('created_at', { ascending: true });
    } else {
      query = query.order('total_score', { ascending: false });
    }

    if (search) {
      query = query.ilike('player_name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch players.' } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    // Query last updated timestamp from score_history
    const { data: latestLog } = await supabase
      .from('score_history')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    const lastUpdated = latestLog && latestLog.length > 0 ? latestLog[0].updated_at : null;

    return NextResponse.json({ 
      data: data || [],
      lastUpdated 
    });
  } catch (err) {
    console.error('Unexpected error in GET /api/players:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

function verifyAdmin(cookieStore: ReturnType<typeof cookies> extends Promise<infer T> ? T : never): boolean {
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expectedHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
  return token === expectedHash;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdmin(cookieStore)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' } satisfies ApiResponse<never>,
        { status: 401 }
      );
    }

    const body = await request.json();
    const { player_name, division, total_score, position } = body;

    if (!player_name || typeof player_name !== 'string' || player_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'player_name is required and must be a non-empty string.' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const validDivisions = [
      'กองทัพมหาเสือพิทักษ์',
      'กองทัพธรณินพิทักษ์',
      'กองทัพอาทมาต',
      'กองพระตำรวจหลวง',
      'กองทัพที่ 1 ปัญจะซันยะ',
      'กองทัพที่ 2 วัชรนาถ',
      'กองทัพที่ 3 ปุณฑริก',
      'กองทัพที่ 4 เกาโมทก'
    ];

    if (!division || typeof division !== 'string' || !validDivisions.includes(division)) {
      return NextResponse.json(
        { error: 'Invalid division. Must be one of the 8 valid divisions.' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const score = total_score !== undefined ? total_score : 0;
    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json(
        { error: 'total_score must be a non-negative number.' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('players')
      .insert({
        player_name: player_name.trim(),
        division,
        total_score: score,
        position: position ? position.trim() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create player.' } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    return NextResponse.json({ data } satisfies ApiResponse<Player>, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in POST /api/players:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
