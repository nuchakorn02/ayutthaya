import { NextRequest, NextResponse } from 'next/server';

// Use Web Crypto so the token check does not depend on Node.js crypto APIs.
async function verifyAdminToken(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return false;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  
  try {
    // 1. สร้าง Hash ด้วย Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(adminPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // 2. ใช้ Constant-time comparison ด้วย bitwise XOR ป้องกัน Timing Attack
    if (token.length !== expectedHash.length) return false;
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 1. ป้องกัน /admin pages — redirect ไป login ถ้าไม่ได้ login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const isValid = await verifyAdminToken(request);
    if (!isValid) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Centralized API Security
  const isApiRoute = pathname.startsWith('/api/');
  
  if (isApiRoute) {
    const isWriteMethod = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(method);
    const isAdminApi = pathname.startsWith('/api/admin/') || pathname === '/api/settings/discord';
    const isLoginEndpoint = pathname === '/api/admin/login';
    
    // Whitelist: endpoints ที่เป็น public และต้องการ method พิเศษ
    const isPublicEndpoint = [
      '/api/players/[id]/history',
    ].some((ep) => pathname.startsWith(ep));

    // ข้ามการเช็ค auth ถ้าเป็นหน้า Login หรือ Public
    if (isLoginEndpoint || isPublicEndpoint) {
      return NextResponse.next();
    }

    // ล็อคทันทีถ้าเป็น (1) Endpoint ของ Admin หรือ (2) เป็นการเขียนข้อมูล (Write Method)
    if (isAdminApi || isWriteMethod) {
      const isValid = await verifyAdminToken(request);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Unauthorized. Admin access required.' },
          { status: 401 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
  ],
};
