import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse, ImportLog } from '@/lib/types';



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    

    // Dynamic params in Next.js 15 are Promises
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: 'Import session ID is required.' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Query logs associated with the session, sorted by largest score increase first
    const { data: logs, error: fetchError } = await adminClient
      .from('import_logs')
      .select('*')
      .eq('import_id', id)
      .order('score_diff', { ascending: false });

    if (fetchError) {
      console.error('Failed to query import logs:', fetchError);
      return NextResponse.json(
        { error: `ล้มเหลวในการดึงประวัติแต้มรายบุคคล: ${fetchError.message}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: logs as ImportLog[]
    } satisfies ApiResponse<ImportLog[]>);
  } catch (err) {
    console.error('Unexpected error in GET /api/admin/imports/[id]:', err);
    return NextResponse.json(
      { error: 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
