import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse, ImportSession } from '@/lib/types';

function verifyAdmin(cookieStore: ReturnType<typeof cookies> extends Promise<infer T> ? T : never): boolean {
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expectedHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
  return token === expectedHash;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdmin(cookieStore)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' } satisfies ApiResponse<never>,
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Query all import sessions ordered by latest upload
    const { data: imports, error: fetchError } = await adminClient
      .from('imports')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Failed to query import sessions:', fetchError);
      return NextResponse.json(
        { error: `ล้มเหลวในการดึงข้อมูลประวัติการนำเข้า: ${fetchError.message}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: imports as ImportSession[]
    } satisfies ApiResponse<ImportSession[]>);
  } catch (err) {
    console.error('Unexpected error in GET /api/admin/imports:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
