import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeCsvCell } from './csvExport.mjs';

test('neutralizes spreadsheet formulas after leading whitespace and control characters', () => {
  for (const value of ['=1+1', ' +cmd', '\t@SUM(A1:A2)', '\r-HYPERLINK("x")']) {
    const escaped = escapeCsvCell(value);
    assert.ok(escaped.startsWith("'") || escaped.startsWith('"\''));
  }
});

test('preserves ordinary CSV escaping and numeric values', () => {
  assert.equal(escapeCsvCell('Player, "One"'), '"Player, ""One"""');
  assert.equal(escapeCsvCell('Player'), 'Player');
  assert.equal(escapeCsvCell(-12), '-12');
});
