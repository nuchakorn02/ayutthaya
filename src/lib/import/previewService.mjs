import { parseSpreadsheet } from './parseSpreadsheet.mjs';
import { buildImportPlan } from './plan.mjs';
import {
  fingerprintSource,
  fingerprintComparisonState,
  signConfirmationContext,
} from './confirmation.mjs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const PREVIEW_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Read import source bytes from either a multipart file upload or a JSON URL body.
 *
 * @param {Request} request
 * @returns {Promise<{ bytes: ArrayBuffer; extension: string; filename: string }>}
 */
export async function readImportSource(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      throw new Error('A CSV or Excel file is required in the "file" field.');
    }

    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new Error('Only CSV and Excel files (.csv, .xlsx, .xls) are accepted.');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`ขนาดไฟล์ต้องไม่เกิน 10MB`);
    }

    return {
      bytes: await file.arrayBuffer(),
      extension,
      filename: file.name,
    };
  }

  const body = await request.json();
  const { url } = body;
  if (!url) {
    throw new Error('A URL parameter is required for remote import.');
  }

  throw new Error('Remote import preview is not yet implemented in this helper; use the direct route with downloadImportFile.');
}

/**
 * Build a read-only import preview from a source and current comparison state.
 *
 * @param {{ bytes: ArrayBuffer; extension: string; filename: string }} source
 * @param {unknown} comparisonState
 * @param {string[]} validDivisions
 * @param {(value: string) => string | null} matchDivisionFuzzy
 * @param {string} secret
 * @param {number} now
 * @returns {Promise<{
 *   source_name: string;
 *   source_fingerprint: string;
 *   comparison_fingerprint: string;
 *   confirmation_token: string | null;
 *   rows: Array<unknown>;
 *   counts: { new: number; updated: number; retired: number; errors: number };
 *   errors: Array<{ source_row: number | null; reason: string }>;
 * }>}
 */
export async function createImportPreview(
  source,
  comparisonState,
  validDivisions,
  matchDivisionFuzzy,
  secret,
  now
) {
  const { rows: parsedRows, errors: parseErrors } = parseSpreadsheet(
    source.bytes,
    source.extension,
    matchDivisionFuzzy
  );

  const plan = buildImportPlan(parsedRows, comparisonState.players || [], validDivisions);

  // Merge parse errors into plan errors.
  for (const parseError of parseErrors) {
    plan.errors.push({ source_row: null, reason: parseError });
    plan.counts.errors++;
  }

  const sourceFingerprint = fingerprintSource(source.bytes);
  const comparisonFingerprint = fingerprintComparisonState(comparisonState);

  const hasErrors = plan.counts.errors > 0;
  const confirmationToken = hasErrors
    ? null
    : signConfirmationContext(
        sourceFingerprint,
        comparisonFingerprint,
        now + PREVIEW_TTL_MS,
        secret
      );

  return {
    source_name: source.filename,
    source_fingerprint: sourceFingerprint,
    comparison_fingerprint: comparisonFingerprint,
    confirmation_token: confirmationToken,
    rows: plan.rows,
    counts: plan.counts,
    errors: plan.errors,
  };
}
