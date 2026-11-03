import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createPublicServerClient } from '@/lib/supabase/server';
import type { Player, ApiResponse } from '@/lib/types';
import { DIVISIONS } from '@/lib/constants';
import { sendDiscordWebhook, getRobloxAvatarUrl, DIVISION_EMBED_COLORS } from '@/lib/discord';
import type { DiscordEmbed } from '@/lib/discord';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division');
    const search = searchParams.get('search');

    // Use anon public client for public read queries to adhere to principle of least privilege
    const publicClient = createPublicServerClient();
    let query = publicClient.from('players').select('*');

    if (division) {
      if (division === 'ปลดประจำการ') {
        return NextResponse.json({ data: [], lastUpdated: null });
      }
      query = query.eq('division', division).order('created_at', { ascending: true });
    } else {
      query = query.neq('division', 'ปลดประจำการ').order('total_score', { ascending: false });
    }

    if (search) {
      query = query.ilike('player_name', `%${search}%`);
    }

    const { data: players, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch players.' } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    // คำนวณ latest_change จาก score_history โดยตรง — ไม่พึ่ง stored field
    // กรองเฉพาะ player IDs ที่อยู่ในผลลัพธ์เพื่อประสิทธิภาพ
    const playerIds = (players || []).map((p) => p.id);
    const { data: allHistory } = playerIds.length > 0
      ? await publicClient
          .from('score_history')
          .select('player_id, score_diff, updated_at')
          .in('player_id', playerIds)
          .order('updated_at', { ascending: false })
      : { data: [] };

    // สร้าง map: player_id → score_diff ล่าสุด (เฉพาะ entry แรกของแต่ละคน)
    const latestChangeMap = new Map<string, number>();
    for (const h of allHistory || []) {
      if (!latestChangeMap.has(h.player_id)) {
        latestChangeMap.set(h.player_id, h.score_diff);
      }
    }

    // Query last updated timestamp from score_history
    const lastUpdated =
      allHistory && allHistory.length > 0 ? allHistory[0].updated_at : null;

    // รวม latest_change ที่คำนวณได้เข้ากับข้อมูล player
    const enrichedPlayers = (players || []).map((p) => ({
      ...p,
      latest_change: latestChangeMap.get(p.id) ?? 0,
    }));

    return NextResponse.json({
      data: enrichedPlayers,
      lastUpdated,
    });
  } catch (err) {
    console.error('Unexpected error in GET /api/players:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { player_name, division, total_score, position } = body;

    if (!player_name || typeof player_name !== 'string' || player_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'player_name is required and must be a non-empty string.' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    if (!division || typeof division !== 'string' || !DIVISIONS.some((validDivision) => validDivision === division)) {
      return NextResponse.json(
        { error: 'Invalid division. Must be one of the valid divisions.' } satisfies ApiResponse<never>,
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

    if (data) {
      const newPlayer = data as Player;

      // Send webhook in background so API response is instant
      (async () => {
        try {
          const avatarUrl = await getRobloxAvatarUrl(newPlayer.player_name);
          const embedColor = DIVISION_EMBED_COLORS[newPlayer.division] || 1096065; // Default Emerald #10B981

          const embed: DiscordEmbed = {
            title: '💂 ลงทะเบียนกำลังพลรายใหม่สำเร็จ!',
            color: embedColor,
            fields: [
              { name: '💂 ชื่อ Roblox', value: `[${newPlayer.player_name}](https://www.roblox.com/users/profile?username=${encodeURIComponent(newPlayer.player_name)})`, inline: true },
              { name: '🛡️ กองสังกัด', value: newPlayer.division, inline: true },
              { name: '🎖️ ยศ/ตำแหน่ง', value: newPlayer.position || 'ไม่มีตำแหน่ง', inline: true },
              { name: '📈 คะแนนเริ่มต้น', value: `\`${newPlayer.total_score}\` แต้ม`, inline: false }
            ],
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
          console.error('[Discord Webhook Exception] Failed to send new player notification:', webhookErr);
        }
      })();
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
