import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/lib/types';

function verifyAdmin(cookieStore: any): boolean {
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expectedHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
  return token === expectedHash;
}

function calculateDefaultPosition(score: number, division: string): string {
  if (division === 'กองทัพมหาเสือพิทักษ์') {
    return 'ทหารเสือประจำพระองค์';
  }
  if (division === 'กองทัพธรณินพิทักษ์') {
    return 'ทหารธรณินพิทักษ์';
  }
  if (division === 'กองทัพอาทมาต') {
    return 'หมื่นอาทมาต';
  }

  const isPolice = division === 'กองพระตำรวจหลวง';

  if (score >= 600) return isPolice ? 'พันตำรวจหลวง | Royal Police Colonel' : 'นายพันเวร | Battalion Commander of Guardsmen';
  if (score >= 315) return isPolice ? 'นายกองตำรวจหลวง | Royal Police Battalion Commander' : 'นายกองเวร | Company Head Guardsmen';
  if (score >= 210) return isPolice ? 'นายหมวดตำรวจหลวง | Royal Police Platoon Officer' : 'นายหมวดเวร | Platoon Head Guardsmen';
  if (score >= 110) return isPolice ? 'นายหมู่ตำรวจหลวง | Royal Police Squad Leader' : 'นายหมู่เวร | Squad Head Guardsmen';
  if (score >= 60) return isPolice ? 'พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper' : 'พลทหารยามอาวุโส | Senior Guardsmen';
  if (score >= 45) return isPolice ? 'พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper' : 'พลทหารราชวัลลภพิเศษ | Royal Elite Guardsmen';
  if (score >= 20) return isPolice ? 'พลประจำการตำรวจหลวง | Active Royal Police Trooper' : 'พลทหารยาม | Guardsmen';
  return isPolice ? 'พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)' : 'พลอาสาสมัครทหารยาม | Junior Guardsmen';
}

export async function POST(
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

    const { id: importId } = await params;
    const adminClient = createAdminClient();

    // 1. Fetch import session
    const { data: session, error: sessionError } = await adminClient
      .from('imports')
      .select('*')
      .eq('id', importId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'ไม่พบเซสชันนำเข้าที่ต้องการย้อนกลับ' } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }

    // 2. Fetch all logs for this session
    const { data: logs, error: logsError } = await adminClient
      .from('import_logs')
      .select('*')
      .eq('import_id', importId);

    if (logsError) {
      console.error('Failed to fetch import logs for rollback:', logsError);
      return NextResponse.json(
        { error: `ล้มเหลวในการดึงประวัติกิจกรรม: ${logsError.message}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    // 3. Revert each log entry
    for (const log of logs || []) {
      // Find player by name and division (or 'ปลดประจำการ' if it was a soft delete)
      const targetDivision = log.new_score === -999 ? 'ปลดประจำการ' : log.division;
      const { data: player, error: playerError } = await adminClient
        .from('players')
        .select('*')
        .eq('player_name', log.player_name)
        .eq('division', targetDivision)
        .maybeSingle();

      if (playerError) {
        console.error(`Error finding player ${log.player_name} for rollback:`, playerError);
        continue;
      }

      if (player) {
        if (log.new_score === -999) {
          // This player was soft-deleted. Restore their original division.
          const { error: restoreError } = await adminClient
            .from('players')
            .update({ division: log.division })
            .eq('id', player.id);
          if (restoreError) {
            console.error(`Failed to restore player ${log.player_name} division during rollback:`, restoreError);
          }
        } else if (log.old_score === 0) {
          // This player was created in this import. We should delete them.
          const { error: deleteError } = await adminClient
            .from('players')
            .delete()
            .eq('id', player.id);
          if (deleteError) {
            console.error(`Failed to delete new player ${log.player_name} during rollback:`, deleteError);
          }
        } else {
          // The player was updated. Revert score.
          const revertedScore = Math.max(0, player.total_score - log.score_diff);
          const revertedPosition = calculateDefaultPosition(revertedScore, player.division);

          const { error: updateError } = await adminClient
            .from('players')
            .update({
              total_score: revertedScore,
              position: revertedPosition,
              latest_change: 0
            })
            .eq('id', player.id);

          if (updateError) {
            console.error(`Failed to revert player ${log.player_name} score during rollback:`, updateError);
          } else {
            // Delete the corresponding score_history entry
            const { error: historyDeleteError } = await adminClient
              .from('score_history')
              .delete()
              .eq('player_id', player.id)
              .eq('score_diff', log.score_diff)
              .eq('new_score', log.new_score);
            
            if (historyDeleteError) {
              console.log(`Note: Score history deletion skipped or not found: ${historyDeleteError.message}`);
            }
          }
        }
      }
    }

    // 4. Delete the import session record (cascades to import_logs)
    const { error: deleteSessionError } = await adminClient
      .from('imports')
      .delete()
      .eq('id', importId);

    if (deleteSessionError) {
      console.error('Failed to delete import session:', deleteSessionError);
      return NextResponse.json(
        { error: `ล้มเหลวในการลบเซสชันนำเข้า: ${deleteSessionError.message}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    // Send Discord Webhook notification in background
    (async () => {
      try {
        const { sendDiscordWebhook } = require('@/lib/discord');

        const embed = {
          title: '⚠️ แจ้งยกเลิกแต้มรอบล่าสุดจ้า',
          description: 'แอดมินขอยกเลิกการปรับแต้มของรอบที่แล้วน้า ตอนนี้ดึงคะแนนของทุกคนกลับไปเป็นแบบเดิมก่อนหน้านี้เรียบร้อยแล้วครับ',
          color: 10034459, // Crimson Red #991B1B
          fields: [
            { name: '📋 สถานะ', value: 'คะแนนและยศกลับไปเป็นเหมือนเดิมแล้วจ้า', inline: false }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'ระบบแต้มกรมทหารราชวัลลภ',
            icon_url: 'https://images.rbxcdn.com/f04c63283259e80277df178f5e1e7f04.png'
          }
        };

        await sendDiscordWebhook({
          embeds: [embed]
        });
      } catch (err) {
        console.error('Failed to send Rollback Discord Webhook:', err);
      }
    })();

    return NextResponse.json({
      data: { success: true }
    } satisfies ApiResponse<{ success: boolean }>);
  } catch (err) {
    console.error('Unexpected error in POST /api/admin/imports/[id]/rollback:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
