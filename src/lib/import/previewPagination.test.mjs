import test from 'node:test';
import assert from 'node:assert/strict';
import { paginatePreviewRows } from './previewPagination.mjs';

function makeRows(count) {
  return Array.from({ length: count }, (_, i) => ({
    action: 'update',
    source_row: i + 1,
    player_name: `Player ${i + 1}`,
    division: 'กองทัพที่ 1 ปัญจะซันยะ',
    current_score: 100,
    proposed_score: 120,
    score_diff: 20,
  }));
}

test('paginatePreviewRows bounds rows to twenty five', () => {
  const rows = makeRows(30);
  const page1 = paginatePreviewRows(rows, 1, 25);
  assert.equal(page1.pageRows.length, 25);
  assert.equal(page1.totalPages, 2);
  assert.equal(page1.hasPrev, false);
  assert.equal(page1.hasNext, true);
  assert.equal(page1.start, 1);
  assert.equal(page1.end, 25);

  const page2 = paginatePreviewRows(rows, 2, 25);
  assert.equal(page2.pageRows.length, 5);
  assert.equal(page2.hasPrev, true);
  assert.equal(page2.hasNext, false);
  assert.equal(page2.start, 26);
  assert.equal(page2.end, 30);
});

test('paginatePreviewRows keeps final partial page', () => {
  const rows = makeRows(53);
  const page1 = paginatePreviewRows(rows, 1, 25);
  const page2 = paginatePreviewRows(rows, 2, 25);
  const page3 = paginatePreviewRows(rows, 3, 25);

  assert.equal(page1.pageRows.length, 25);
  assert.equal(page2.pageRows.length, 25);
  assert.equal(page3.pageRows.length, 3);
  assert.equal(page3.totalPages, 3);
  assert.equal(page3.start, 51);
  assert.equal(page3.end, 53);
});

test('paginatePreviewRows clamps out of range page numbers', () => {
  const rows = makeRows(10);
  const page0 = paginatePreviewRows(rows, 0, 25);
  assert.equal(page0.pageRows.length, 10);
  assert.equal(page0.page, 1);

  const page99 = paginatePreviewRows(rows, 99, 25);
  assert.equal(page99.pageRows.length, 10);
  assert.equal(page99.page, 1);
});

test('paginatePreviewRows tolerates empty rows', () => {
  const result = paginatePreviewRows([], 1, 25);
  assert.deepEqual(result.pageRows, []);
  assert.equal(result.totalPages, 0);
  assert.equal(result.hasPrev, false);
  assert.equal(result.hasNext, false);
  assert.equal(result.start, 0);
  assert.equal(result.end, 0);
});
