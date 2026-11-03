import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/lib/types';
import { sendDiscordWebhook } from '@/lib/discord';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    

    const { id: importId } = await params;
    const adminClient = createAdminClient();

    const { error: rollbackError } = await adminClient.rpc('rollback_import_session', {
      p_import_id: importId,
    });

    if (rollbackError) {
      console.error(`Failed to rollback import session ${importId}:`, rollbackError);

      if (rollbackError.message.includes('was not found')) {
        return NextResponse.json(
          { error: 'ไม่พบเซสชันนำเข้าที่ต้องการย้อนกลับ' } satisfies ApiResponse<never>,
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `ย้อนกลับไม่สำเร็จ ข้อมูลเซสชันยังคงอยู่: ${rollbackError.message}` } satisfies ApiResponse<never>,
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
          embeds: [embed],
          eventType: 'import',
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
