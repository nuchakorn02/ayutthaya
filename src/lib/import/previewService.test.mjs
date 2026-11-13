import test from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { createImportPreview, readImportSource } from './previewService.mjs';

const VALID_DIVISIONS = ['กองทัพมหาเสือพิทักษ์'];

function matchDivisionFuzzy(value) {
  if (value.includes('กองทัพมหาเสือ')) return 'กองทัพมหาเสือพิทักษ์';
  return null;
}

test('readImportSource reads a local file', async () => {
  const data = [
    ['กองทัพมหาเสือพิทักษ์'],
    ['รายชื่อ', 'แต้มใหม่'],
    ['Alice', '100'],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const file = new File([buffer], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const formData = new FormData();
  formData.append('file', file);

  const request = new Request('http://localhost/api/import', {
    method: 'POST',
    body: formData,
  });

  const source = await readImportSource(request);
  assert.equal(source.extension, '.xlsx');
  assert.equal(source.filename, 'test.xlsx');
  assert.ok(source.bytes.byteLength > 0);
});

test('createImportPreview returns rows, counts, errors, and fingerprints', async () => {
  const data = [
    ['กองทัพมหาเสือพิทักษ์'],
    ['รายชื่อ', 'แต้มใหม่'],
    ['Alice', '100'],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const source = {
    bytes: buffer,
    extension: '.xlsx',
    filename: 'test.xlsx',
  };

  const comparisonState = { players: [] };
  const preview = await createImportPreview(
    source,
    comparisonState,
    VALID_DIVISIONS,
    matchDivisionFuzzy,
    'secret',
    Date.now()
  );

  assert.equal(preview.source_name, 'test.xlsx');
  assert.ok(preview.source_fingerprint);
  assert.ok(preview.comparison_fingerprint);
  assert.ok(preview.confirmation_token);
  assert.equal(preview.counts.new, 1);
  assert.equal(preview.rows.length, 1);
});

test('createImportPreview does not issue token for invalid plan', async () => {
  const data = [
    ['รายชื่อ', 'แต้มใหม่'],
    ['Alice', 'invalid'],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const source = {
    bytes: buffer,
    extension: '.xlsx',
    filename: 'test.xlsx',
  };

  const comparisonState = { players: [] };
  const preview = await createImportPreview(
    source,
    comparisonState,
    VALID_DIVISIONS,
    matchDivisionFuzzy,
    'secret',
    Date.now()
  );

  assert.equal(preview.confirmation_token, null);
  assert.equal(preview.counts.errors, 1);
});
