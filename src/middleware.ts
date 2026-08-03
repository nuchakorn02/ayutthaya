import { NextRequest, NextResponse } from 'next/server';

// Routes ที่ถูก disable แล้ว (deprecated/dangerous endpoints)
const DISABLED_ROUTES = ['/api/migrate'];

// ทำงานบน Edge Runtime ไม่สามารถใช้ Node.js crypto ได้ ต้องใช้ Web Crypto API แทน
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 1. Block disabled/deprecated endpoints ทันที
  if (DISABLED_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.json(
      { error: 'This endpoint has been disabled.' },
      { status: 410 }
    );
  }

  // 2. ป้องกัน /admin pages — redirect ไป login ถ้าไม่ได้ login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const isValid = await verifyAdminToken(request);
    if (!isValid) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. ป้องกัน write API endpoints (POST, PATCH, DELETE, PUT)
  const isWriteMethod = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(method);

  // Whitelist: endpoints ที่ไม่ต้อง auth (public read, login)
  const publicEndpoints = [
    '/api/admin/login',
    '/api/players/[id]/history',
  ];
  const isPublicEndpoint = publicEndpoints.some((ep) => pathname.startsWith(ep));

  if (isWriteMethod && pathname.startsWith('/api/') && !isPublicEndpoint) {
    if (pathname === '/api/admin/login') {
      return NextResponse.next();
    }

    const isValid = await verifyAdminToken(request);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
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
