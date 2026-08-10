import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { sendDiscordWebhook, getRobloxAvatarUrl, DIVISION_EMBED_COLORS } from '@/lib/discord';
import type { Player, ApiResponse } from '@/lib/types';



export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Player ID is required.' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const body = await request.json();
    const { total_score, position, reason, division, player_name } = body;

    if (total_score === undefined && position === undefined && division === undefined && player_name === undefined) {
      return NextResponse.json(
        { error: 'total_score, position, division, or player_name is required.' } satisfies ApiResponse<never>,
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

    if (player_name !== undefined) {
      if (typeof player_name !== 'string' || player_name.trim().length === 0) {
        return NextResponse.json(
          { error: 'player_name must be a non-empty string.' } satisfies ApiResponse<never>,
          { status: 400 }
        );
      }
      if (player_name.trim().length > 50) {
        return NextResponse.json(
          { error: 'player_name must be 50 characters or fewer.' } satisfies ApiResponse<never>,
          { status: 400 }
        );
      }
      // Check for duplicate name (excluding self)
      const { data: duplicate } = await adminClient
        .from('players')
        .select('id')
        .eq('player_name', player_name.trim())
        .neq('id', id)
        .maybeSingle();
      if (duplicate) {
        return NextResponse.json(
          { error: `ชื่อ "${player_name.trim()}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น` } satisfies ApiResponse<never>,
          { status: 409 }
        );
      }
      updatePayload.player_name = player_name.trim();
    }

    if (total_score !== undefined && typeof total_score === 'number') {
      newScore = total_score;
      scoreDiff = newScore - oldScore;
      updatePayload.total_score = newScore;
      updatePayload.latest_change = scoreDiff;
    }

    if (position !== undefined) {
      updatePayload.position = position ? position.trim() : null;
    }

    if (division !== undefined) {
      updatePayload.division = division ? division.trim() : 'ไม่ทราบสังกัด';
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
          reason: reason ? reason.trim() : null,
        });

      if (historyError) {
        // Bug fix: อัปเดตคะแนนสำเร็จ แต่บันทึกประวัติผิดพลาด ไม่ตัดสินจบ request เพื่อให้ Discord webhook ยังทำงานได้
        console.error('Score history insert error (non-fatal):', historyError);
      }
    }

    if (scoreDiff !== 0) {
      const diffSign = scoreDiff > 0 ? '+' : '';
      const playerName = existingPlayer.player_name;
      const divisionName = existingPlayer.division;
      const playerPos = (updatedPlayer as any).position || 'ไม่มีตำแหน่ง';
      
      // Determine embed color from division or default to gold
      const embedColor = DIVISION_EMBED_COLORS[divisionName] || 13938487;

      // Run background fetching for avatar and send webhook asynchronously
      (async () => {
        try {
          const avatarUrl = await getRobloxAvatarUrl(playerName);

          const fields = [
            { name: '💂 กำลังพล', value: `[${playerName}](https://www.roblox.com/users/profile?username=${encodeURIComponent(playerName)})`, inline: true },
            { name: '🛡️ กองสังกัด', value: divisionName, inline: true },
            { name: '🎖️ ยศ/ตำแหน่ง', value: playerPos, inline: true },
            { name: '📈 คะแนนสะสม', value: `\`${oldScore}\` ➡️ \`${newScore}\` (**${diffSign}${scoreDiff}** แต้ม)`, inline: false },
          ];

          if (reason) {
            fields.push({ name: '📝 เหตุผลการปรับปรุง', value: reason.trim(), inline: false });
          }

          const embed: any = {
            title: scoreDiff > 0 ? '📈 มอบแต้มกิจกรรมกำลังรบสำเร็จ!' : '📉 หักแต้มสะสมกำลังรบ!',
            color: embedColor,
            fields: fields,
            timestamp: new Date().toISOString(),
            footer: {
              text: 'ระบบแต้มกรมทหารราชวัลลภ',
              icon_url: 'https://omlbtybplmeryoigwmac.supabase.co/storage/v1/object/public/public_assets/logo.png'
            }
          };

          if (avatarUrl) {
            embed.thumbnail = { url: avatarUrl };
          }

          await sendDiscordWebhook({
            embeds: [embed]
          });
        } catch (webhookErr) {
          console.error('[Discord Webhook Exception] Failed in background sender:', webhookErr);
        }
      })();
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
