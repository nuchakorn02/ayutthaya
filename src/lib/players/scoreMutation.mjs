export function resolveScoreMutation({ total_score, retire }) {
  if (retire !== undefined && retire !== false && retire !== true) {
    throw new Error('retire must be true when requesting player retirement.');
  }

  if (retire === true) {
    if (total_score !== undefined) {
      throw new Error('A retirement request must not include total_score.');
    }
    return { score: -999, retired: true };
  }

  if (total_score === undefined) return null;
  if (typeof total_score !== 'number' || !Number.isFinite(total_score) || total_score < 0) {
    throw new Error('total_score must be a finite non-negative number.');
  }

  return { score: total_score, retired: false };
}
