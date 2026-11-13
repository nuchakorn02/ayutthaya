import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImportScore } from './scoreParsing.mjs';
import { RETIRED_SCORE } from '../constants.mjs';

test('parseImportScore accepts decimals and comma-grouped numbers', () => {
  assert.equal(parseImportScore(0), 0);
  assert.equal(parseImportScore(12.75), 12.75);
  assert.equal(parseImportScore('1,234.5'), 1234.5);
  assert.equal(parseImportScore('42'), 42);
});

test('parseImportScore rejects invalid scores', () => {
  assert.equal(parseImportScore(''), null);
  assert.equal(parseImportScore('   '), null);
  assert.equal(parseImportScore('12abc'), null);
  assert.equal(parseImportScore('1,,234'), null);
  assert.equal(parseImportScore(NaN), null);
  assert.equal(parseImportScore(Infinity), null);
  assert.equal(parseImportScore(-5), null);
  assert.equal(parseImportScore(String(RETIRED_SCORE)), null);
});
