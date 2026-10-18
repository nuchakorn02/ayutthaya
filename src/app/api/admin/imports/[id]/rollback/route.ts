import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/lib/types';
import { calculateDefaultPosition } from '@/lib/positionUtils';
import { sendDiscordWebhook } from '@/lib/discord';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    

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
          // This player was soft-deleted. Restore their original division AND score.
          const { error: restoreError } = await adminClient
            .from('players')
            .update({
              division: log.division,
              total_score: log.old_score  // คืนแต้มเดิมด้วย ไม่ใช่แค่ division
            })
            .eq('id', player.id);
          if (restoreError) {
            console.error(`Failed to restore player ${log.player_name} during rollback:`, restoreError);
          }
        } else if (log.old_score === 0 && log.score_diff > 0 && log.score_diff === log.new_score) {
          // ลบเฉพาะคนที่ถูก INSERT ใหม่จริงๆ ใน import นี้
          // (old_score=0, score_diff=new_score หมายความว่าเป็นคนใหม่ ไม่ใช่คนเดิมที่แต้มเป็น 0)
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

          // Delete the bad import's score_history entry first
          const { error: historyDeleteError } = await adminClient
            .from('score_history')
            .delete()
            .eq('player_id', player.id)
            .eq('score_diff', log.score_diff)
            .eq('new_score', log.new_score);

          if (historyDeleteError) {
            console.log(`Note: Score history deletion skipped: ${historyDeleteError.message}`);
          }

          // คืน total_score และ position — ไม่ต้อง update latest_change
          // เพราะระบบคำนวณ latest_change จาก score_history ตอน query เสมอ
          const { error: updateError } = await adminClient
            .from('players')
            .update({
              total_score: revertedScore,
              position: revertedPosition,
            })
            .eq('id', player.id);

          if (updateError) {
            console.error(`Failed to revert player ${log.player_name} score during rollback:`, updateError);
          }
        }
      }
    }

    // 4. Delete the import session record (cascades to import_logs via FK)
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
            icon_url: 'https://omlbtybplmeryoigwmac.supabase.co/storage/v1/object/public/public_assets/logo.png'
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
