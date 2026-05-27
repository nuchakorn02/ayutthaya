import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required.' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set.');
      return NextResponse.json(
        { error: 'Server configuration error.' } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    // Rate Limiter Check by IP address
    let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown-ip';
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    const adminClient = createAdminClient();

    // Query login attempt details for this IP
    const { data: attemptRecord, error: fetchAttemptError } = await adminClient
      .from('login_attempts')
      .select('*')
      .eq('ip_address', ip)
      .maybeSingle();

    const now = new Date();

    if (attemptRecord && attemptRecord.locked_until) {
      const lockoutTime = new Date(attemptRecord.locked_until);
      if (lockoutTime > now) {
        const remainingMin = Math.ceil((lockoutTime.getTime() - now.getTime()) / (1000 * 60));
        return NextResponse.json(
          { error: `คุณป้อนรหัสผ่านผิดเกิน 3 ครั้ง ระบบได้ระงับการเข้าสู่ระบบ 20 นาที กรุณาลองใหม่ในอีก ${remainingMin} นาที` } satisfies ApiResponse<never>,
          { status: 429 }
        );
      } else {
        // Lockout time expired, reset attempts in database
        await adminClient
          .from('login_attempts')
          .update({ attempts: 0, locked_until: null })
          .eq('ip_address', ip);
        
        attemptRecord.attempts = 0;
        attemptRecord.locked_until = null;
      }
    }

    if (password !== adminPassword) {
      const currentAttempts = (attemptRecord?.attempts || 0) + 1;
      let lockedUntil = null;
      if (currentAttempts >= 3) {
        lockedUntil = new Date(now.getTime() + 20 * 60 * 1000).toISOString();
      }

      await adminClient
        .from('login_attempts')
        .upsert({
          ip_address: ip,
          attempts: currentAttempts,
          locked_until: lockedUntil
        });

      if (currentAttempts >= 3) {
        return NextResponse.json(
          { error: 'คุณป้อนรหัสผ่านผิดเกิน 3 ครั้ง บัญชีนี้ถูกล็อกเป็นเวลา 20 นาที' } satisfies ApiResponse<never>,
          { status: 429 }
        );
      } else {
        return NextResponse.json(
          { error: `รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง (ระบุผิดพลาดแล้ว ${currentAttempts}/3 ครั้ง)` } satisfies ApiResponse<never>,
          { status: 401 }
        );
      }
    }

    // Success: reset attempts to 0
    await adminClient
      .from('login_attempts')
      .upsert({
        ip_address: ip,
        attempts: 0,
        locked_until: null
      });

    const tokenHash = crypto.createHash('sha256').update(password).digest('hex');

    const response = NextResponse.json(
      { data: { message: 'Login successful.' } } satisfies ApiResponse<{ message: string }>,
      { status: 200 }
    );

    response.cookies.set('admin_token', tokenHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15, // 15 minutes (session auto-expires quickly for safety)
    });

    return response;
  } catch (err) {
    console.error('Unexpected error in POST /api/admin/login:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
