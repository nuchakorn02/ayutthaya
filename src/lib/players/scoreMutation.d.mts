type ScoreMutation = {
  score: number;
  retired: boolean;
};

export function resolveScoreMutation(input: {
  total_score?: unknown;
  retire?: unknown;
}): ScoreMutation | null;
