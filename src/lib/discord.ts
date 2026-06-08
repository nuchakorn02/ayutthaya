interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
  footer?: { text: string; icon_url?: string };
}

export async function sendDiscordWebhook(payload: {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Discord Webhook] Webhook URL not set. Skipping notification.');
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Discord Webhook] Failed to post webhook: ${res.status} ${text}`);
    } else {
      console.log('[Discord Webhook] Notification sent successfully.');
    }
  } catch (err) {
    console.error('[Discord Webhook] Error sending webhook:', err);
  }
}
