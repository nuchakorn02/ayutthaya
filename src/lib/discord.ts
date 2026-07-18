interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
  thumbnail?: { url: string };
  footer?: { text: string; icon_url?: string };
}

export const DIVISION_EMBED_COLORS: Record<string, number> = {
  'คณะผู้บริหาร': 11032055, // Purple #A855F7
  'กองทัพมหาเสือพิทักษ์': 14251782, // Amber #D97706
  'กองทัพธรณินพิทักษ์': 9133302, // Violet #8B5CF6
  'กองทัพอาทมาต': 7434618, // Zinc #71717A
  'กองพระตำรวจหลวง': 14251782, // Amber #D97706
  'กองทัพที่ 1 ปัญจะซันยะ': 9741240, // Slate #94A3B8
  'กองทัพที่ 2 วัชรนาถ': 16007006, // Rose #F43F5E
  'กองทัพที่ 3 ปุณฑริก': 1096065, // Emerald #10B981
  'กองทัพที่ 4 เกาโมทก': 960489, // Sky #0EA5E9
};

/** Helper to fetch a direct Roblox user avatar headshot thumbnail URL */
export async function getRobloxAvatarUrl(username: string): Promise<string | undefined> {
  try {
    const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames: [username.trim()],
        excludeBannedUsers: false
      })
    });
    if (!userRes.ok) return undefined;
    const userData = await userRes.json();
    const userId = userData.data?.[0]?.id;
    if (!userId) return undefined;

    const thumbRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`
    );
    if (!thumbRes.ok) return undefined;
    const thumbData = await thumbRes.json();
    return thumbData.data?.[0]?.imageUrl || undefined;
  } catch (err) {
    console.error(`[Discord Webhook] Failed to fetch Roblox avatar for ${username}:`, err);
    return undefined;
  }
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
