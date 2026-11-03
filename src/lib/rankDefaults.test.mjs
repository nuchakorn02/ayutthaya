import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_RANK_THRESHOLDS } from './rankDefaults.mjs';

test('defines each fallback rank threshold once in ascending score order', () => {
  assert.deepEqual(
    DEFAULT_RANK_THRESHOLDS.map((threshold) => threshold.score),
    [0, 20, 45, 60, 110, 210, 315, 600]
  );
  assert.ok(DEFAULT_RANK_THRESHOLDS.every((threshold) => threshold.guardTitle && threshold.policeTitle));
});
