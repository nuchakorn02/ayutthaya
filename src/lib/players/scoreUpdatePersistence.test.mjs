import assert from 'node:assert/strict';
import test from 'node:test';
import { persistPlayerUpdateWithHistory } from './scoreUpdatePersistence.mjs';

test('rejects score updates when the atomic player-and-history write fails', async () => {
  const expectedError = new Error('score_history insert failed');
  const rpc = async () => ({ data: null, error: expectedError });

  await assert.rejects(
    persistPlayerUpdateWithHistory(rpc, {
      playerId: 'player-1',
      updates: { total_score: 42, latest_change: 2 },
      reason: 'กิจกรรม',
    }),
    /score_history insert failed/
  );
});

test('persists score changes through the atomic RPC and returns its result', async () => {
  const rpcResult = {
    player: { id: 'player-1', total_score: 42 },
    old_score: 40,
    new_score: 42,
    score_diff: 2,
  };
  const input = {
    playerId: 'player-1',
    updates: { total_score: 42, latest_change: 2 },
    reason: 'กิจกรรม',
  };
  let call;
  const rpc = async (...args) => {
    call = args;
    return { data: rpcResult, error: null };
  };

  const result = await persistPlayerUpdateWithHistory(rpc, input);

  assert.deepEqual(call, [
    'update_player_with_score_history',
    {
      p_player_id: 'player-1',
      p_updates: input.updates,
      p_reason: 'กิจกรรม',
    },
  ]);
  assert.deepEqual(result, rpcResult);
});
