export async function persistPlayerUpdateWithHistory(rpc, { playerId, updates, reason }) {
  const { data, error } = await rpc('update_player_with_score_history', {
    p_player_id: playerId,
    p_updates: updates,
    p_reason: reason,
  });

  if (error) {
    throw new Error(`Atomic player score update failed: ${error.message}`);
  }

  if (!data || typeof data !== 'object' || !('player' in data)) {
    throw new Error('Atomic player score update returned an invalid result.');
  }

  return data;
}
