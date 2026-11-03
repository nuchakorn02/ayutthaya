import type { RankThreshold } from '@/lib/types';

export interface DefaultRankThreshold extends RankThreshold {
  guardProgressTitle?: string;
  policeProgressTitle?: string;
}

export const DEFAULT_RANK_THRESHOLDS: DefaultRankThreshold[];
