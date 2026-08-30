import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse, ImportSession } from '@/lib/types';



export async function GET(request: NextRequest) {
  try {
    

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
