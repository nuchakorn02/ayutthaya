import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/lib/types';
import {
  parseLoginAttemptResult,
  recordFailedAttempt,
} from '@/lib/loginRateLimiter.mjs';
import type { LoginAttemptResult } from '@/lib/loginRateLimiter.mjs';

// In-memory rate-limiter fallback cache for robust multi-tier protection
interface MemoryAttempt {
  attempts: number;
  lockedUntil: number | null;
}
const memoryRateLimiter = new Map<string, MemoryAttempt>();

const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 20;

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

    const now = Date.now();
    const memAttempt = memoryRateLimiter.get(ip);
    if (memAttempt && memAttempt.lockedUntil && memAttempt.lockedUntil > now) {
      const remainingMin = Math.ceil((memAttempt.lockedUntil - now) / (1000 * 60));
      return NextResponse.json(
        { error: `คุณป้อนรหัสผ่านผิดเกิน ${MAX_ATTEMPTS} ครั้ง ระบบได้ระงับการเข้าสู่ระบบ ${LOCKOUT_MINUTES} นาที กรุณาลองใหม่ในอีก ${remainingMin} นาที` } satisfies ApiResponse<never>,
        { status: 429 }
      );
    }

    const passwordBuffer = Buffer.from(password);
    const adminPasswordBuffer = Buffer.from(adminPassword);
    const isPasswordValid =
      passwordBuffer.length === adminPasswordBuffer.length &&
      crypto.timingSafeEqual(passwordBuffer, adminPasswordBuffer);

    let attemptResult: LoginAttemptResult;
    const adminClient = createAdminClient();
    try {
      const { data, error } = await adminClient.rpc('process_admin_login_attempt', {
        p_ip_address: ip,
        p_password_valid: isPasswordValid,
        p_max_attempts: MAX_ATTEMPTS,
        p_lockout_minutes: LOCKOUT_MINUTES,
      });
      if (error) throw new Error(error.message);

      attemptResult = parseLoginAttemptResult(data);
      if (attemptResult.isLocked) {
        memoryRateLimiter.set(ip, {
          attempts: attemptResult.attempts,
          lockedUntil: attemptResult.lockedUntil,
        });
      } else if (attemptResult.authenticated) {
        memoryRateLimiter.delete(ip);
      } else {
        memoryRateLimiter.set(ip, {
          attempts: attemptResult.attempts,
          lockedUntil: attemptResult.lockedUntil,
        });
      }
    } catch (rateLimitError) {
      console.warn('Atomic login rate-limit RPC failed; using in-memory fallback:', rateLimitError);
      if (isPasswordValid) {
        memoryRateLimiter.delete(ip);
        attemptResult = { authenticated: true, isLocked: false, attempts: 0, lockedUntil: null };
      } else {
        const fallback = recordFailedAttempt(
          memoryRateLimiter,
          ip,
          Date.now(),
          MAX_ATTEMPTS,
          LOCKOUT_MINUTES * 60 * 1000
        );
        attemptResult = { ...fallback, authenticated: false };
      }
    }

    if (attemptResult.isLocked) {
      const lockedUntil = attemptResult.lockedUntil ?? Date.now() + LOCKOUT_MINUTES * 60 * 1000;
      const remainingMin = Math.max(1, Math.ceil((lockedUntil - Date.now()) / (1000 * 60)));
      return NextResponse.json(
        { error: `คุณป้อนรหัสผ่านผิดเกิน ${MAX_ATTEMPTS} ครั้ง ระบบได้ระงับการเข้าสู่ระบบ ${LOCKOUT_MINUTES} นาที กรุณาลองใหม่ในอีก ${remainingMin} นาที` } satisfies ApiResponse<never>,
        { status: 429 }
      );
    }

    if (!attemptResult.authenticated) {
      return NextResponse.json(
        { error: `รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง (ระบุผิดพลาดแล้ว ${attemptResult.attempts}/${MAX_ATTEMPTS} ครั้ง)` } satisfies ApiResponse<never>,
        { status: 401 }
      );
    }

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
      maxAge: 60 * 60, // 60 minutes
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
