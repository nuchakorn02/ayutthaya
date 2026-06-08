import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache to prevent hitting Roblox API limits too often
const avatarCache = new Map<string, { url: string; expiry: number }>();
const CACHE_DURATION = 1000 * 60 * 60 * 24; // Cache for 24 hours

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
  
  // Check cache first
  const cached = avatarCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.redirect(cached.url, { status: 302 });
  }

  try {
    // 1. Get user ID from Roblox
    const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        usernames: [cleanUsername],
        excludeBannedUsers: false
      })
    });

    if (!userRes.ok) {
      throw new Error(`Roblox users API error: ${userRes.status}`);
    }

    const userData = await userRes.json();
    const user = userData.data?.[0];

    if (!user || !user.id) {
      // User not found in Roblox, return SVG directly
      return new NextResponse(makeFallbackSvg(cleanUsername), {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    const userId = user.id;

    // 2. Get Avatar Image from Roblox
    const thumbRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=100x100&format=Png&isCircular=true`
    );

    if (!thumbRes.ok) {
      throw new Error(`Roblox thumbnails API error: ${thumbRes.status}`);
    }

    const thumbData = await thumbRes.json();
    const imageUrl = thumbData.data?.[0]?.imageUrl;

    if (!imageUrl) {
      throw new Error('No image URL returned from Roblox');
    }

    // Save in cache
    avatarCache.set(cacheKey, {
      url: imageUrl,
      expiry: Date.now() + CACHE_DURATION
    });

    return NextResponse.redirect(imageUrl, { status: 302 });
  } catch (error) {
    console.error(`Failed to fetch Roblox avatar for ${cleanUsername}:`, error);
    // Return SVG fallback avatar directly on error
    return new NextResponse(makeFallbackSvg(cleanUsername), {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  }
}
