import assert from 'node:assert/strict';
import test from 'node:test';
import { loadRankThresholds } from './rankThresholds.mjs';

test('uses saved rank thresholds instead of fallback thresholds for imports', async () => {
  const savedThresholds = [
    { score: 73, policeTitle: 'Custom police rank', guardTitle: 'Custom guard rank' },
  ];
  const fallbackThresholds = [
    { score: 600, policeTitle: 'Default police rank', guardTitle: 'Default guard rank' },
  ];

  const thresholds = await loadRankThresholds(
    async () => savedThresholds,
    fallbackThresholds
  );

  assert.deepEqual(thresholds, savedThresholds);
});

test('uses fallback rank thresholds when no saved thresholds are available', async () => {
  const fallbackThresholds = [
    { score: 600, policeTitle: 'Default police rank', guardTitle: 'Default guard rank' },
  ];

  const thresholds = await loadRankThresholds(async () => undefined, fallbackThresholds);

  assert.deepEqual(thresholds, fallbackThresholds);
});
