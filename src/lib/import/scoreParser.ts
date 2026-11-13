/**
 * Parse a score value from an imported spreadsheet.
 *
 * Accepts finite, non-negative numbers and fully numeric strings with
 * optional valid comma grouping and one decimal point.
 *
 * Rejects blank values, partially numeric strings, NaN, Infinity,
 * negative numbers, and the -999 retirement sentinel.
 */
import { RETIRED_SCORE } from '../constants.mjs';

export function parseImportScore(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || value === RETIRED_SCORE) {
      return null;
    }
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  // Reject explicit negative sign or the retirement sentinel.
  if (trimmed.startsWith('-')) {
    return null;
  }

  // Validate format: digits with optional valid comma grouping and at most one decimal point.
  const normalized = trimmed.replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  // Comma grouping check: if commas exist, they must group exactly 3 digits.
  if (trimmed.includes(',')) {
    const parts = trimmed.split('.');
    const integerPart = parts[0];
    const commaGroups = integerPart.split(',');
    // First group may be 1-3 digits; every following group must be exactly 3 digits.
    if (commaGroups[0].length === 0 || commaGroups[0].length > 3) {
      return null;
    }
    for (let i = 1; i < commaGroups.length; i++) {
      if (commaGroups[i].length !== 3) {
        return null;
      }
    }
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed === RETIRED_SCORE) {
    return null;
  }

  return parsed;
}
