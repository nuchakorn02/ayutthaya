import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveScoreMutation } from './scoreMutation.mjs';

test('rejects direct negative scores including the retired-player sentinel', () => {
  assert.throws(() => resolveScoreMutation({ total_score: -1 }), /non-negative/);
  assert.throws(() => resolveScoreMutation({ total_score: -999 }), /non-negative/);
});

test('accepts finite non-negative numeric scores', () => {
  assert.deepEqual(resolveScoreMutation({ total_score: 0 }), { score: 0, retired: false });
  assert.deepEqual(resolveScoreMutation({ total_score: 12.5 }), { score: 12.5, retired: false });
});

test('keeps retirement available as an explicit action without accepting a score sentinel', () => {
  assert.deepEqual(resolveScoreMutation({ retire: true }), { score: -999, retired: true });
  assert.throws(
    () => resolveScoreMutation({ retire: true, total_score: -999 }),
    /must not include total_score/
  );
});
