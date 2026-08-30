import { NextRequest, NextResponse } from 'next/server';

function makeFallbackSvg(username: string): string {
  const initials = username.slice(0, 2).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="48" fill="#111128" stroke="#fbbf24" stroke-width="3"/>
    <text x="50" y="58" fill="#fbbf24" font-size="28" font-family="sans-serif" font-weight="bold" text-anchor="middle">${initials}</text>
  </svg>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const cleanUsername = username.trim();
  const cacheKey = cleanUsername.toLowerCase();

  try {
    // 1. Get user ID from Roblox with Next.js fetch cache (24 hours)
    const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        usernames: [cleanUsername],
        excludeBannedUsers: false
      }),
      next: { revalidate: 86400 } // Cache for 24 hours via Next.js Data Cache
    });

    if (!userRes.ok) {
      throw new Error(`Roblox users API error: ${userRes.status}`);
    }

    const userData = await userRes.json();
    const user = userData.data?.[0];

    if (!user || !user.id) {
      return new NextResponse(makeFallbackSvg(cleanUsername), {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    const userId = user.id;

    // 2. Get Avatar Image from Roblox with Next.js fetch cache
    const thumbRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=100x100&format=Webp&isCircular=true`,
      { next: { revalidate: 86400 } }
    );

    if (!thumbRes.ok) {
      throw new Error(`Roblox thumbnails API error: ${thumbRes.status}`);
    }

    const thumbData = await thumbRes.json();
    const imageUrl = thumbData.data?.[0]?.imageUrl;

    if (!imageUrl) {
      throw new Error('No image URL returned from Roblox');
    }

    // Set Cache-Control header so CDN/Browser also caches the redirect
    return NextResponse.redirect(imageUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
      }
    });
  } catch (error) {
    console.error(`Failed to fetch Roblox avatar for ${cleanUsername}:`, error);
    return new NextResponse(makeFallbackSvg(cleanUsername), {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  }
}
