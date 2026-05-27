import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import type { Player, ApiResponse } from '@/lib/types';

function verifyAdmin(cookieStore: ReturnType<typeof cookies> extends Promise<infer T> ? T : never): boolean {
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expectedHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
  return token === expectedHash;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdmin(cookieStore)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' } satisfies ApiResponse<never>,
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Player ID is required.' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const body = await request.json();
    const { total_score, position } = body;

    if (total_score === undefined && position === undefined) {
      return NextResponse.json(
        { error: 'total_score or position is required.' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch current player to get old_score
    const { data: existingPlayer, error: fetchError } = await adminClient
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingPlayer) {
      console.error('Player fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Player not found.' } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }

    const updatePayload: any = {};
    let oldScore = existingPlayer.total_score;
    let newScore = oldScore;
    let scoreDiff = 0;

    if (total_score !== undefined && typeof total_score === 'number') {
      newScore = total_score;
      scoreDiff = newScore - oldScore;
      updatePayload.total_score = newScore;
      updatePayload.latest_change = scoreDiff;
    }

    if (position !== undefined) {
      updatePayload.position = position ? position.trim() : null;
    }

    // 2. Update player
    const { data: updatedPlayer, error: updateError } = await adminClient
      .from('players')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Player update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update player.' } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    // 3. Insert score history record if score changed
    if (scoreDiff !== 0) {
      const { error: historyError } = await adminClient
        .from('score_history')
        .insert({
          player_id: id,
          old_score: oldScore,
          new_score: newScore,
          score_diff: scoreDiff,
        });

      if (historyError) {
        console.error('Score history insert error:', historyError);
        // Score was updated but history failed — log but don't fail the request
        return NextResponse.json(
          {
            data: updatedPlayer as Player,
            error: 'Player updated but failed to record history.',
          } satisfies ApiResponse<Player>,
          { status: 200 }
        );
      }
    }

    return NextResponse.json({ data: updatedPlayer as Player } satisfies ApiResponse<Player>);
  } catch (err) {
    console.error('Unexpected error in PATCH /api/players/[id]:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdmin(cookieStore)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' } satisfies ApiResponse<never>,
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Player ID is required.' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.from('players').delete().eq('id', id);

    if (error) {
      console.error('Player delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete player.' } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { id } } satisfies ApiResponse<{ id: string }>);
  } catch (err) {
    console.error('Unexpected error in DELETE /api/players/[id]:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
