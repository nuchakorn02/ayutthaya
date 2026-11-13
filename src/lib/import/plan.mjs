import { parseImportScore } from './scoreParsing.mjs';
import { RETIRED_SCORE } from '../constants.mjs';

/**
 * Build a read-only import plan from parsed spreadsheet rows and current DB players.
 *
 * @param {Array<{ player_name: string; division: string; total_score: number | null; position: string; source_row: number; raw_score: unknown }>} parsedRows
 * @param {Array<{ id: string; player_name: string; division: string; total_score: number; position?: string; starting_score?: number; latest_change?: number }>} existingPlayers
 * @param {string[]} validDivisions
 * @returns {{
 *   rows: Array<{
 *     action: 'new' | 'update' | 'retire' | 'error';
 *     source_row: number | null;
 *     player_id?: string;
 *     player_name: string;
 *     division: string;
 *     current_score: number | null;
 *     proposed_score: number | null;
 *     score_diff: number | null;
 *     message?: string;
 *   }>;
 *   counts: { new: number; updated: number; retired: number; errors: number };
 *   errors: Array<{ source_row: number | null; reason: string }>;
 * }}
 */
export function buildImportPlan(parsedRows, existingPlayers, validDivisions) {
  const rows = [];
  const errors = [];
  const counts = { new: 0, updated: 0, retired: 0, errors: 0 };

  const existingByName = new Map();
  for (const p of existingPlayers || []) {
    if (!existingByName.has(p.player_name)) {
      existingByName.set(p.player_name, []);
    }
    existingByName.get(p.player_name).push(p);
  }

  const seenNames = new Set();
  const matchedPlayerIds = new Set();
  let hasValidRow = false;

  for (const parsed of parsedRows) {
    const sourceRow = parsed.source_row;
    const playerName = parsed.player_name;
    const division = parsed.division;
    const score = parseImportScore(parsed.raw_score);

    if (seenNames.has(playerName)) {
      const reason = `แถวที่ ${sourceRow}: พบชื่อผู้เล่น "${playerName}" ซ้ำซ้อนในไฟล์`;
      rows.push({
        action: 'error',
        source_row: sourceRow,
        player_name: playerName,
        division,
        current_score: null,
        proposed_score: null,
        score_diff: null,
        message: reason,
      });
      errors.push({ source_row: sourceRow, reason });
      counts.errors++;
      continue;
    }
    seenNames.add(playerName);

    if (!playerName) {
      const reason = `แถวที่ ${sourceRow}: ไม่พบชื่อผู้เล่น`;
      rows.push(makeErrorRow(sourceRow, '', division, reason));
      errors.push({ source_row: sourceRow, reason });
      counts.errors++;
      continue;
    }

    if (!division || !validDivisions.includes(division)) {
      const reason = `แถวที่ ${sourceRow}: กองสังกัดไม่ถูกต้อง (${division || 'ว่าง'})`;
      rows.push(makeErrorRow(sourceRow, playerName, division, reason));
      errors.push({ source_row: sourceRow, reason });
      counts.errors++;
      continue;
    }

    if (score === null) {
      const reason = `แถวที่ ${sourceRow}: คะแนนไม่ถูกต้อง (${parsed.raw_score ?? 'ว่าง'})`;
      rows.push(makeErrorRow(sourceRow, playerName, division, reason));
      errors.push({ source_row: sourceRow, reason });
      counts.errors++;
      continue;
    }

    hasValidRow = true;

    const matches = existingByName.get(playerName) || [];
    if (matches.length > 1) {
      const reason = `แถวที่ ${sourceRow}: พบชื่อผู้เล่น "${playerName}" ซ้ำในฐานข้อมูลหลายรายการ`;
      rows.push(makeErrorRow(sourceRow, playerName, division, reason));
      errors.push({ source_row: sourceRow, reason });
      counts.errors++;
      continue;
    }

    const existing = matches[0];
    if (!existing) {
      rows.push({
        action: 'new',
        source_row: sourceRow,
        player_name: playerName,
        division,
        current_score: null,
        proposed_score: score,
        score_diff: score,
      });
      counts.new++;
    } else {
      matchedPlayerIds.add(existing.id);
      const currentScore = existing.total_score;
      const isDivisionTransfer = existing.division !== division;
      const scoreDiff = score - currentScore;

      if (currentScore === score && !isDivisionTransfer) {
        // Unchanged; still include so the admin sees it but don't count as update.
        rows.push({
          action: 'update',
          source_row: sourceRow,
          player_id: existing.id,
          player_name: playerName,
          division,
          current_score: currentScore,
          proposed_score: score,
          score_diff: 0,
        });
      } else {
        rows.push({
          action: 'update',
          source_row: sourceRow,
          player_id: existing.id,
          player_name: playerName,
          division,
          current_score: currentScore,
          proposed_score: score,
          score_diff: scoreDiff,
        });
        counts.updated++;
      }
    }
  }

  if (hasValidRow) {
    for (const p of existingPlayers || []) {
      if (!matchedPlayerIds.has(p.id) && p.division !== 'ปลดประจำการ') {
        rows.push({
          action: 'retire',
          source_row: null,
          player_id: p.id,
          player_name: p.player_name,
          division: p.division,
          current_score: p.total_score,
          proposed_score: RETIRED_SCORE,
          score_diff: null,
        });
        counts.retired++;
      }
    }
  }

  return { rows, counts, errors };
}

function makeErrorRow(sourceRow, playerName, division, reason) {
  return {
    action: 'error',
    source_row: sourceRow,
    player_name: playerName,
    division,
    current_score: null,
    proposed_score: null,
    score_diff: null,
    message: reason,
  };
}
