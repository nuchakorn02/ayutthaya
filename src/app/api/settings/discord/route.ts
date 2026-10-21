import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getDiscordSettings, clearDiscordSettingsCache, sendDiscordWebhook } from '@/lib/discord';

function maskWebhookUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/');
    // Format: /api/webhooks/{id}/{token}
    if (parts.length >= 4) {
      parts[parts.length - 1] = '******';
      return `${parsed.origin}${parts.join('/')}`;
    }
    return `${url.slice(0, 25)}******`;
  } catch {
    return '******';
  }
}

export async function GET() {
  try {
    const settings = await getDiscordSettings();
    return NextResponse.json({
      enabled: settings.enabled,
      has_custom_url: Boolean(settings.webhook_url && settings.webhook_url !== process.env.DISCORD_WEBHOOK_URL),
      masked_url: maskWebhookUrl(settings.webhook_url || ''),
      has_env_url: Boolean(process.env.DISCORD_WEBHOOK_URL),
      notify_on_import: settings.notify_on_import ?? true,
      notify_on_edit: settings.notify_on_edit ?? true,
      notify_on_delete: settings.notify_on_delete ?? true,
    });
  } catch (error) {
    console.error('Error in GET /api/settings/discord:', error);
    return NextResponse.json({ error: 'Failed to load Discord settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'test') {
      const testUrl = body.webhook_url?.trim();
      const settings = await getDiscordSettings();
      const targetUrl = testUrl && !testUrl.includes('******') ? testUrl : settings.webhook_url;

      if (!targetUrl) {
        return NextResponse.json(
          { error: 'ยังไม่มีการตั้งค่า Webhook URL กรุณากรอก Webhook URL ก่อนทดสอบ' },
          { status: 400 }
        );
      }

      // Send test ping directly or via helper
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'ระบบทำเนียบทหารราชวัลลภ',
          avatar_url: 'https://cdn.discordapp.com/attachments/1187426118465060864/1218584826188234853/logo.png',
          embeds: [
            {
              title: '🔔 ทดสอบระบบแจ้งเตือน Discord Webhook',
              description: 'การเชื่อมต่อระบบแจ้งเตือนทำเนียบทหารมหาดเล็กราชวัลลภรักษาพระองค์ทำงานได้อย่างสมบูรณ์แบบ!',
              color: 14251782, // Gold 0xD4AF37
              fields: [
                {
                  name: '⚡ สถานะการเชื่อมต่อ',
                  value: '✅ ออนไลน์และพร้อมใช้งาน (Online)',
                  inline: true,
                },
                {
                  name: '⏰ เวลาที่ทดสอบ',
                  value: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
                  inline: true,
                },
              ],
              footer: {
                text: 'ระบบจัดการทำเนียบ กรมทหารราชวัลลภ',
              },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json(
          { error: `Discord ปฏิเสธคำขอ (${res.status}): ${errorText || 'โปรดตรวจสอบ Webhook URL'}` },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, message: 'ส่งข้อความทดสอบไปยัง Discord สำเร็จแล้ว!' });
    }

    if (action === 'save') {
      const {
        enabled,
        webhook_url,
        notify_on_import,
        notify_on_edit,
        notify_on_delete,
      } = body;

      const currentSettings = await getDiscordSettings();
      let cleanUrl = currentSettings.webhook_url || '';

      // If a new URL is provided and not masked
      if (typeof webhook_url === 'string') {
        const trimmed = webhook_url.trim();
        if (trimmed === '') {
          // Clear custom override
          cleanUrl = '';
        } else if (!trimmed.includes('******')) {
          if (!trimmed.startsWith('https://discord.com/api/webhooks/') && !trimmed.startsWith('https://discordapp.com/api/webhooks/')) {
            return NextResponse.json(
              { error: 'รูปแบบ Webhook URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://discord.com/api/webhooks/...)' },
              { status: 400 }
            );
          }
          cleanUrl = trimmed;
        }
      }

      const updatedConfig = {
        enabled: Boolean(enabled),
        webhook_url: cleanUrl,
        notify_on_import: notify_on_import ?? true,
        notify_on_edit: notify_on_edit ?? true,
        notify_on_delete: notify_on_delete ?? true,
      };

      const adminClient = createAdminClient();
      const { error: dbError } = await adminClient
        .from('app_settings')
        .upsert({
          key: 'discord_settings',
          value: updatedConfig,
          updated_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('Supabase save discord_settings error:', dbError);
        return NextResponse.json({ error: `บันทึกไม่สำเร็จ: ${dbError.message}` }, { status: 500 });
      }

      clearDiscordSettingsCache();

      return NextResponse.json({
        success: true,
        message: 'บันทึกการตั้งค่า Discord สำเร็จเรียบร้อย!',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/settings/discord:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}
