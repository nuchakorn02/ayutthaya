import { createAdminClient } from '@/lib/supabase/server';

/**
 * Auto-reconcile score_history to ensure no player is missing history
 * and no gaps exist between their total_score and their latest history record.
 */
export async function autoReconcileScores(adminClient: ReturnType<typeof createAdminClient>) {
  const { data: players, error: playersError } = await adminClient
    .from('players')
    .select('id, total_score, starting_score')
    .neq('division', 'ปลดประจำการ')
    .neq('total_score', -999);

  if (playersError) {
    throw new Error(`Failed to fetch players for score reconciliation: ${playersError.message}`);
  }

  const { data: allHistory, error: historyError } = await adminClient
    .from('score_history')
    .select('player_id, new_score')
    .order('updated_at', { ascending: false });

  if (historyError) {
    throw new Error(`Failed to fetch score history for reconciliation: ${historyError.message}`);
  }

  const latestHistMap = new Map<string, { new_score: number }>();
  const hasHistorySet = new Set<string>();

  for (const h of allHistory || []) {
    hasHistorySet.add(h.player_id);
    if (!latestHistMap.has(h.player_id)) {
      latestHistMap.set(h.player_id, h as { new_score: number });
    }
  }

  const newHistories: { player_id: string; old_score: number; new_score: number; score_diff: number }[] = [];

  for (const p of players || []) {
    const score = p.total_score;
    if (score <= 0) continue;

    if (!hasHistorySet.has(p.id)) {
      const oldScore = p.starting_score || 0;
      newHistories.push({
        player_id: p.id,
        old_score: oldScore,
        new_score: score,
        score_diff: score - oldScore
      });
    } else {
      const latest = latestHistMap.get(p.id);
      if (latest && Math.abs(score - latest.new_score) > 0.001) {
        newHistories.push({
          player_id: p.id,
          old_score: latest.new_score,
          new_score: score,
          score_diff: score - latest.new_score
        });
      }
    }
  }

  if (newHistories.length > 0) {
    const { error: insertError } = await adminClient.from('score_history').insert(newHistories);
    if (insertError) {
      throw new Error(`Failed to insert reconciled score history: ${insertError.message}`);
    }
    console.log(`Auto-reconciled ${newHistories.length} score_history gaps.`);
  }
}
