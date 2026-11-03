export async function loadRankThresholds(readSavedThresholds, fallbackThresholds) {
  try {
    const savedThresholds = await readSavedThresholds();
    if (Array.isArray(savedThresholds)) return savedThresholds;
  } catch (error) {
    console.warn('Failed to load saved rank thresholds; using fallback settings:', error);
  }

  return Array.isArray(fallbackThresholds) ? fallbackThresholds : [];
}
