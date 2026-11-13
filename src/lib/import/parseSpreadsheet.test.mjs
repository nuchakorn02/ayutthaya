import test from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { parseSpreadsheet } from './parseSpreadsheet.mjs';

function mockMatchDivisionFuzzy(value) {
  if (value.includes('กองทัพมหาเสือ')) return 'กองทัพมหาเสือพิทักษ์';
  if (value.includes('ธรณินพิทักษ์')) return 'กองทัพธรณินพิทักษ์';
  return null;
}

test('parseSpreadsheet preserves banner division and source row', () => {
  const data = [
    ['กองทัพมหาเสือพิทักษ์'],
    ['รายชื่อ', 'แต้มใหม่'],
    ['Alice', '100'],
    ['ธรณินพิทักษ์'],
    ['Bob', '200'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const result = parseSpreadsheet(buffer, '.xlsx', mockMatchDivisionFuzzy);

  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].player_name, 'Alice');
  assert.equal(result.rows[0].division, 'กองทัพมหาเสือพิทักษ์');
  assert.equal(result.rows[0].source_row, 3);
  assert.equal(result.rows[0].raw_score, '100');
  assert.equal(result.rows[1].player_name, 'Bob');
  assert.equal(result.rows[1].division, 'กองทัพธรณินพิทักษ์');
  assert.equal(result.rows[1].source_row, 5);
});

test('parseSpreadsheet returns errors for invalid header', () => {
  const data = [
    ['Foo', 'Bar'],
    ['Alice', '100'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const result = parseSpreadsheet(buffer, '.xlsx', mockMatchDivisionFuzzy);

  assert.equal(result.rows.length, 0);
  assert.ok(result.errors.length > 0);
});
