import assert from 'node:assert/strict';
import test from 'node:test';
import { getActivePlayersOutcome } from './topIncreases.mjs';

test('reports player-query failures instead of treating them as no active players', () => {
  const outcome = getActivePlayersOutcome(null, { message: 'database unavailable' });

  assert.deepEqual(outcome, {
    kind: 'error',
    message: 'database unavailable',
  });
});

test('distinguishes a successful empty player query from a query failure', () => {
  assert.deepEqual(getActivePlayersOutcome([], null), { kind: 'empty' });
});

test('passes active player rows through for history lookup', () => {
  const activePlayers = [{ id: 'player-1', player_name: 'Player', division: 'division' }];

  assert.deepEqual(getActivePlayersOutcome(activePlayers, null), {
    kind: 'players',
    players: activePlayers,
  });
});

test('treats a missing result without a database error as an invalid response', () => {
  assert.deepEqual(getActivePlayersOutcome(null, null), {
    kind: 'error',
    message: 'Player query returned no result.',
  });
});
