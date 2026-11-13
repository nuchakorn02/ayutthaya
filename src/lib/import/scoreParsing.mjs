/**
 * Parse a score value from an imported spreadsheet.
 *
 * Accepts finite, non-negative numbers and fully numeric strings with
 * optional valid comma grouping and one decimal point.
 *
 * Rejects blank values, partially numeric strings, NaN, Infinity,
 * negative numbers, and the -999 retirement sentinel.
 *
 * @param {unknown} value
 * @returns {number | null}
 */
import { RETIRED_SCORE } from '../constants.mjs';

export function parseImportScore(value) {
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

  if (trimmed.startsWith('-')) {
    return null;
  }

  const normalized = trimmed.replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  if (trimmed.includes(',')) {
    const parts = trimmed.split('.');
    const integerPart = parts[0];
    const commaGroups = integerPart.split(',');
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
