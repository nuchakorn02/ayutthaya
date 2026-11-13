import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseImportScore } from './scoreParser.ts';
import { RETIRED_SCORE } from '../constants.mjs';

describe('parseImportScore', () => {
  it('accepts finite numeric values', () => {
    assert.equal(parseImportScore(0), 0);
    assert.equal(parseImportScore(12.75), 12.75);
    assert.equal(parseImportScore(1234), 1234);
  });

  it('accepts fully numeric strings with optional comma grouping and decimals', () => {
    assert.equal(parseImportScore('0'), 0);
    assert.equal(parseImportScore('12.75'), 12.75);
    assert.equal(parseImportScore('1,234.5'), 1234.5);
    assert.equal(parseImportScore('1,234,567'), 1234567);
    assert.equal(parseImportScore('  42  '), 42);
  });

  it('rejects blank and whitespace-only values', () => {
    assert.equal(parseImportScore(''), null);
    assert.equal(parseImportScore('   '), null);
    assert.equal(parseImportScore(null), null);
    assert.equal(parseImportScore(undefined), null);
  });

  it('rejects partially numeric strings', () => {
    assert.equal(parseImportScore('12abc'), null);
    assert.equal(parseImportScore('abc'), null);
    assert.equal(parseImportScore('12.34.56'), null);
    assert.equal(parseImportScore('1,,234'), null);
    assert.equal(parseImportScore('1,23,4'), null);
    assert.equal(parseImportScore('12-34'), null);
  });

  it('rejects non-finite values', () => {
    assert.equal(parseImportScore(NaN), null);
    assert.equal(parseImportScore(Infinity), null);
    assert.equal(parseImportScore(-Infinity), null);
    assert.equal(parseImportScore('NaN'), null);
    assert.equal(parseImportScore('Infinity'), null);
  });

  it('rejects negative values and retirement sentinel', () => {
    assert.equal(parseImportScore(-5), null);
    assert.equal(parseImportScore('-5'), null);
    assert.equal(parseImportScore(RETIRED_SCORE), null);
    assert.equal(parseImportScore(String(RETIRED_SCORE)), null);
    assert.equal(parseImportScore(-0.5), null);
  });
});
