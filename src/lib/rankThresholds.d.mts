import type { RankThreshold } from './types';

export function loadRankThresholds(
  readSavedThresholds: () => Promise<unknown>,
  fallbackThresholds: RankThreshold[]
): Promise<RankThreshold[]>;
