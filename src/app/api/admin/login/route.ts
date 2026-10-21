import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/lib/types';

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

    // 1. Check in-memory rate limiter first (instant response)
    const memAttempt = memoryRateLimiter.get(ip);
    if (memAttempt && memAttempt.lockedUntil && memAttempt.lockedUntil > now) {
      const remainingMin = Math.ceil((memAttempt.lockedUntil - now) / (1000 * 60));
      return NextResponse.json(
        { error: `คุณป้อนรหัสผ่านผิดเกิน ${MAX_ATTEMPTS} ครั้ง ระบบได้ระงับการเข้าสู่ระบบ ${LOCKOUT_MINUTES} นาที กรุณาลองใหม่ในอีก ${remainingMin} นาที` } satisfies ApiResponse<never>,
        { status: 429 }
      );
    }

    // 2. Check Supabase login_attempts table
    const adminClient = createAdminClient();
    let dbLockedUntil: number | null = null;
    let dbAttempts = 0;

    try {
      const { data: attemptRecord } = await adminClient
        .from('login_attempts')
        .select('*')
        .eq('ip_address', ip)
        .maybeSingle();

      if (attemptRecord) {
        dbAttempts = attemptRecord.attempts || 0;
        if (attemptRecord.locked_until) {
          const lockTime = new Date(attemptRecord.locked_until).getTime();
          if (lockTime > now) {
            dbLockedUntil = lockTime;
          } else {
            // Lockout expired in DB
            dbAttempts = 0;
            await adminClient
              .from('login_attempts')
              .update({ attempts: 0, locked_until: null })
              .eq('ip_address', ip);
          }
        }
      }
    } catch (dbErr) {
      console.warn('DB login_attempts query failed, relying on in-memory limiter:', dbErr);
    }

    // If either DB or memory is locked out
    const activeLock = Math.max(memAttempt?.lockedUntil || 0, dbLockedUntil || 0);
    if (activeLock > now) {
      const remainingMin = Math.ceil((activeLock - now) / (1000 * 60));
      return NextResponse.json(
        { error: `คุณป้อนรหัสผ่านผิดเกิน ${MAX_ATTEMPTS} ครั้ง ระบบได้ระงับการเข้าสู่ระบบ ${LOCKOUT_MINUTES} นาที กรุณาลองใหม่ในอีก ${remainingMin} นาที` } satisfies ApiResponse<never>,
        { status: 429 }
      );
    }

    // Verify Password with constant-time comparison
    const passwordBuffer = Buffer.from(password);
    const adminPasswordBuffer = Buffer.from(adminPassword);
    const isPasswordValid =
      passwordBuffer.length === adminPasswordBuffer.length &&
      crypto.timingSafeEqual(passwordBuffer, adminPasswordBuffer);

    if (!isPasswordValid) {
      const currentAttempts = Math.max(memAttempt?.attempts || 0, dbAttempts) + 1;
      const isLocked = currentAttempts >= MAX_ATTEMPTS;
      const lockUntil = isLocked ? now + LOCKOUT_MINUTES * 60 * 1000 : null;

      // Update in-memory
      memoryRateLimiter.set(ip, {
        attempts: currentAttempts,
        lockedUntil: lockUntil,
      });

      // Update database asynchronously
      try {
        await adminClient
          .from('login_attempts')
          .upsert({
            ip_address: ip,
            attempts: currentAttempts,
            locked_until: lockUntil ? new Date(lockUntil).toISOString() : null,
          });
      } catch (upsertErr) {
        console.warn('Failed to upsert DB login attempt:', upsertErr);
      }

      if (isLocked) {
        return NextResponse.json(
          { error: `คุณป้อนรหัสผ่านผิดเกิน ${MAX_ATTEMPTS} ครั้ง บัญชีนี้ถูกล็อกเป็นเวลา ${LOCKOUT_MINUTES} นาที` } satisfies ApiResponse<never>,
          { status: 429 }
        );
      } else {
        return NextResponse.json(
          { error: `รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง (ระบุผิดพลาดแล้ว ${currentAttempts}/${MAX_ATTEMPTS} ครั้ง)` } satisfies ApiResponse<never>,
          { status: 401 }
        );
      }
    }

    // Success: reset attempts in both memory and database
    memoryRateLimiter.delete(ip);
    try {
      await adminClient
        .from('login_attempts')
        .upsert({
          ip_address: ip,
          attempts: 0,
          locked_until: null,
        });
    } catch {
      // Ignore DB error on success cleanup
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
