import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/lib/types';

function verifyAdmin(cookieStore: any): boolean {
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return false;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expectedHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
  return token === expectedHash;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (!verifyAdmin(cookieStore)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' } satisfies ApiResponse<never>,
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Delete all players (this cascades to score_history)
    const { error: playersDeleteError } = await adminClient
      .from('players')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

    if (playersDeleteError) {
      console.error('Failed to delete players:', playersDeleteError);
      return NextResponse.json(
        { error: `ล้มเหลวในการล้างข้อมูลผู้เล่น: ${playersDeleteError.message}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    // 2. Delete all imports (this cascades to import_logs)
    const { error: importsDeleteError } = await adminClient
      .from('imports')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

    if (importsDeleteError) {
      console.error('Failed to delete imports:', importsDeleteError);
      return NextResponse.json(
        { error: `ล้มเหลวในการล้างข้อมูลเซสชันนำเข้า: ${importsDeleteError.message}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { success: true }
    } satisfies ApiResponse<{ success: boolean }>);
  } catch (err) {
    console.error('Unexpected error in POST /api/admin/reset:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
