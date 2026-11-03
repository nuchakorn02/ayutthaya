async function repairBrokenHistories(supabase, { today, log }) {
  const { data: brokenHistories, error: historyQueryError } = await supabase
    .from('score_history')
    .select('id, player_id, new_score, players(player_name)')
    .eq('old_score', -999)
    .eq('score_diff', 0)
    .gte('updated_at', today.toISOString());

  if (historyQueryError) {
    throw new Error(`Error fetching broken histories: ${historyQueryError.message}`);
  }
  if (!Array.isArray(brokenHistories)) {
    throw new Error('Broken history query returned no result.');
  }

  log(`Found ${brokenHistories.length} broken history records.`);

  const summary = { found: brokenHistories.length, fixed: 0, failed: 0 };

  for (const history of brokenHistories) {
    const playerName = history.players?.player_name;
    if (!playerName || !history.player_id || !history.id) {
      summary.failed++;
      log(`Could not resolve player or history identifiers for history ${history.id || '(unknown)'}.`);
      continue;
    }

    const { data: previousLog, error: logQueryError } = await supabase
      .from('import_logs')
      .select('old_score')
      .eq('player_name', playerName)
      .eq('new_score', -999)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (logQueryError) {
      summary.failed++;
      log(`Failed to find the previous import log for ${playerName}: ${logQueryError.message}`);
      continue;
    }
    if (!previousLog) {
      summary.failed++;
      log(`No previous retirement import log found for ${playerName}.`);
      continue;
    }

    const realScoreDiff = history.new_score - previousLog.old_score;
    if (realScoreDiff === 0) continue;

    const { data: updatedHistory, error: historyUpdateError } = await supabase
      .from('score_history')
      .update({ score_diff: realScoreDiff })
      .eq('id', history.id)
      .select('id')
      .maybeSingle();

    if (historyUpdateError || !updatedHistory) {
      summary.failed++;
      log(`Failed to update score history for ${playerName}: ${historyUpdateError?.message || 'record not found'}`);
      continue;
    }

    const { data: updatedPlayer, error: playerUpdateError } = await supabase
      .from('players')
      .update({ latest_change: realScoreDiff })
      .eq('id', history.player_id)
      .select('id')
      .maybeSingle();

    if (playerUpdateError || !updatedPlayer) {
      summary.failed++;
      log(`Failed to update latest_change for ${playerName}: ${playerUpdateError?.message || 'player not found'}`);
      continue;
    }

    summary.fixed++;
    log(`Fixed player ${playerName}: Diff ${realScoreDiff}`);
  }

  log(`Repair summary: ${summary.fixed} fixed, ${summary.failed} failed, ${summary.found} found.`);
  return summary;
}

async function runHistoryRepair(supabase, { today, log }) {
  const summary = await repairBrokenHistories(supabase, { today, log });
  if (summary.failed > 0) {
    log(`Repair incomplete: ${summary.failed} record(s) failed. Resolve the errors and rerun.`);
    return { exitCode: 1, summary };
  }

  log(`Done fixing database. Repaired ${summary.fixed} of ${summary.found} record(s).`);
  return { exitCode: 0, summary };
}

module.exports = { repairBrokenHistories, runHistoryRepair };
