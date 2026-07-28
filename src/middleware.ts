import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Routes ที่ถูก disable แล้ว (deprecated/dangerous endpoints)
const DISABLED_ROUTES = ['/api/migrate'];

function verifyAdminToken(request: NextRequest): boolean {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return false;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expectedHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
  // ใช้ timingSafeEqual เพื่อป้องกัน timing attack
  try {
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expectedHash);
    if (tokenBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
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
    if (!verifyAdminToken(request)) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. ป้องกัน write API endpoints (POST, PATCH, DELETE, PUT)
  //    ต้องมี valid admin cookie — เป็น defense-in-depth เพิ่มจาก route handler
  const isWriteMethod = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(method);

  // Whitelist: endpoints ที่ไม่ต้อง auth (public read, login)
  const publicEndpoints = [
    '/api/admin/login',
    '/api/players/[id]/history',
  ];
  const isPublicEndpoint = publicEndpoints.some((ep) => pathname.startsWith(ep));

  if (isWriteMethod && pathname.startsWith('/api/') && !isPublicEndpoint) {
    // /api/admin/login เอง ก็ต้องผ่านได้ (ตอน POST login)
    if (pathname === '/api/admin/login') {
      return NextResponse.next();
    }

    if (!verifyAdminToken(request)) {
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
