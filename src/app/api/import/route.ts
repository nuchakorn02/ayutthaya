import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/lib/types';
import { matchDivisionFuzzy } from '@/lib/import/divisionMatcher';
import { downloadImportFile } from '@/lib/import/remoteFile';
import { createImportPreview } from '@/lib/import/previewService.mjs';
import { fingerprintComparisonState, fingerprintSource, verifyConfirmationContext } from '@/lib/import/confirmation.mjs';
import { parseSpreadsheet } from '@/lib/import/parseSpreadsheet.mjs';
import { buildImportPlan } from '@/lib/import/plan.mjs';


interface ImportResult {
  imported: number;
  updated: number;
  errors: string[];
}

interface ImportSource {
  buffer: ArrayBuffer;
  fileExtension: string;
  fileName: string;
}

const VALID_DIVISIONS = [
  'คณะผู้บริหาร',
  'กองทัพมหาเสือพิทักษ์',
  'กองทัพธรณินพิทักษ์',
  'กองทัพอาทมาต',
  'กองพระตำรวจหลวง',
  'กองทัพที่ 1 ปัญจะซันยะ',
  'กองทัพที่ 2 วัชรนาถ',
  'กองทัพที่ 3 ปุณฑริก',
  'กองทัพที่ 4 เกาโมทก'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getPreviewSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for import confirmation');
  }
  return secret;
}


export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let action: string | undefined;
    let source: ImportSource;
    let confirmationBody: Record<string, unknown> = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      action = String(formData.get('action') || '');

      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'A CSV or Excel file is required in the "file" field.' } satisfies ApiResponse<never>,
          { status: 400 }
        );
      }

      const allowedExtensions = ['.csv', '.xlsx', '.xls'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        return NextResponse.json(
          { error: 'Only CSV and Excel files (.csv, .xlsx, .xls) are accepted.' } satisfies ApiResponse<never>,
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `ขนาดไฟล์ต้องไม่เกิน 10MB (ไฟล์ที่อัปโหลดมีขนาด ${(file.size / 1024 / 1024).toFixed(1)}MB)` } satisfies ApiResponse<never>,
          { status: 413 }
        );
      }

      source = {
        buffer: await file.arrayBuffer(),
        fileExtension,
        fileName: file.name,
      };

      confirmationBody = {
        confirmation_token: formData.get('confirmation_token'),
        source_fingerprint: formData.get('source_fingerprint'),
        comparison_fingerprint: formData.get('comparison_fingerprint'),
      };
    } else {
      const body = await request.json();
      action = body.action;
      confirmationBody = body;

      const { url } = body;
      if (!url) {
        return NextResponse.json(
          { error: 'A URL parameter is required for remote import.' } satisfies ApiResponse<never>,
          { status: 400 }
        );
      }

      const trimmedUrl = url.trim();
      const downloadUrl = new URL(trimmedUrl);
      if (
        downloadUrl.hostname.includes('onedrive.live.com') ||
        downloadUrl.hostname.includes('1drv.ms')
      ) {
        const separator = downloadUrl.search ? '&' : '?';
        downloadUrl.search = `${downloadUrl.search ? downloadUrl.search.slice(1) : ''}${separator}download=1`.replace(/^&/, '?');
      }

      const downloaded = await downloadImportFile(downloadUrl);

      if (downloaded.contentType.includes('text/html')) {
        if (
          trimmedUrl.includes('onedrive.live.com') ||
          trimmedUrl.includes('1drv.ms')
        ) {
          const base64 = Buffer.from(trimmedUrl).toString('base64');
          const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          const graphUrl = `https://graph.microsoft.com/v1.0/shares/u!${encoded}/driveItem/content`;
          const graphDownloaded = await downloadImportFile(graphUrl);
          source = {
            buffer: graphDownloaded.buffer,
            fileExtension: '.xlsx',
            fileName: 'OneDrive Remote File',
          };
        } else {
          return NextResponse.json(
            { error: 'ดาวน์โหลดไฟล์ไม่สำเร็จ — ได้รับหน้า HTML แทนไฟล์' } satisfies ApiResponse<never>,
            { status: 400 }
          );
        }
      } else {
        source = {
          buffer: downloaded.buffer,
          fileExtension: downloaded.contentDisposition.includes('.csv') ? '.csv' : '.xlsx',
          fileName: 'OneDrive Remote File',
        };
      }
    }

    if (!action || (action !== 'preview' && action !== 'confirm')) {
      return NextResponse.json(
        { error: 'ต้องระบุ action เป็น "preview" หรือ "confirm"' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    if (action === 'preview') {
      const adminClient = createAdminClient();
      const { data: existingPlayers } = await adminClient
        .from('players')
        .select('id, player_name, division, total_score, position, starting_score, latest_change');

      const preview = await createImportPreview(
        { bytes: source.buffer, extension: source.fileExtension, filename: source.fileName },
        { players: existingPlayers || [] },
        VALID_DIVISIONS,
        matchDivisionFuzzy,
        getPreviewSecret(),
        Date.now()
      );

      return NextResponse.json({ data: preview } satisfies ApiResponse<typeof preview>);
    }

    // confirm
    const token = String(confirmationBody.confirmation_token || '');
    const sourceFingerprint = String(confirmationBody.source_fingerprint || '');
    const comparisonFingerprint = String(confirmationBody.comparison_fingerprint || '');

    if (!token || !sourceFingerprint || !comparisonFingerprint) {
      return NextResponse.json(
        { error: 'ข้อมูลการยืนยันไม่ครบถ้วน กรุณาตรวจสอบใหม่อีกครั้ง' } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data: existingPlayers } = await adminClient
      .from('players')
      .select('id, player_name, division, total_score, position, starting_score, latest_change');

    const currentComparisonFingerprint = fingerprintComparisonState({ players: existingPlayers || [] });
    if (currentComparisonFingerprint !== comparisonFingerprint) {
      return NextResponse.json(
        { error: 'ข้อมูลผู้เล่นมีการเปลี่ยนแปลงตั้งแต่ตรวจสอบ กรุณาตรวจสอบใหม่อีกครั้ง' } satisfies ApiResponse<never>,
        { status: 409 }
      );
    }

    const currentSourceFingerprint = fingerprintSource(source.buffer);
    if (currentSourceFingerprint !== sourceFingerprint) {
      return NextResponse.json(
        { error: 'ไฟล์ต้นฉบับมีการเปลี่ยนแปลงตั้งแต่ตรวจสอบ กรุณาตรวจสอบใหม่อีกครั้ง' } satisfies ApiResponse<never>,
        { status: 409 }
      );
    }

    if (!verifyConfirmationContext(token, getPreviewSecret(), sourceFingerprint, comparisonFingerprint, Date.now())) {
      return NextResponse.json(
        { error: 'ข้อมูลการยืนยันไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบใหม่อีกครั้ง' } satisfies ApiResponse<never>,
        { status: 409 }
      );
    }

    // Rebuild the canonical plan from the freshly read source and current DB state.
    const { rows: parsedRows, errors: parseErrors } = parseSpreadsheet(
      source.buffer,
      source.fileExtension,
      matchDivisionFuzzy
    );

    if (parseErrors.length > 0) {
      return NextResponse.json(
        { error: parseErrors.join('; ') } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const plan = buildImportPlan(parsedRows, existingPlayers || [], VALID_DIVISIONS);
    if (plan.counts.errors > 0) {
      return NextResponse.json(
        { error: 'ไฟล์มีข้อผิดพลาดหลังจากตรวจสอบซ้ำ กรุณาตรวจสอบใหม่อีกครั้ง' } satisfies ApiResponse<never>,
        { status: 422 }
      );
    }

    const rpcResult = await adminClient.rpc('commit_import_preview', {
      p_expected_state: { players: existingPlayers || [] },
      p_import_plan: { rows: plan.rows },
      p_filename: source.fileName || 'OneDrive Remote File',
    });

    if (rpcResult.error) {
      if (rpcResult.error.message?.includes('PZ003') || rpcResult.error.message?.includes('state has changed')) {
        return NextResponse.json(
          { error: 'ข้อมูลผู้เล่นมีการเปลี่ยนแปลงตั้งแต่ตรวจสอบ กรุณาตรวจสอบใหม่อีกครั้ง' } satisfies ApiResponse<never>,
          { status: 409 }
        );
      }
      console.error('commit_import_preview RPC failed:', rpcResult.error);
      return NextResponse.json(
        { error: `นำเข้าไม่สำเร็จ: ${rpcResult.error.message}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    const result = rpcResult.data as {
      import_id: string;
      imported: number;
      updated: number;
      errors: string[];
      persistence_errors: { row: unknown; message: string }[];
    };

    const partial = result.persistence_errors.length > 0;
    const errors = [
      ...result.errors,
      ...result.persistence_errors.map((e) => e.message),
    ];

    return NextResponse.json(
      {
        ...(partial && { partial: true, error: 'Import was only partially applied. Review the import session before retrying.' }),
        data: {
          imported: result.imported,
          updated: result.updated,
          errors,
          import_id: result.import_id,
          partial,
        },
      } satisfies ApiResponse<ImportResult & { import_id: string; partial: boolean }> & { partial?: boolean; error?: string },
      { status: partial ? 500 : 200 }
    );
  } catch (err) {
    console.error('Unexpected error in POST /api/import:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
