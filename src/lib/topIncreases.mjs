export function getActivePlayersOutcome(players, error) {
  if (error) {
    return { kind: 'error', message: error.message };
  }

  if (players === null) {
    return { kind: 'error', message: 'Player query returned no result.' };
  }

  if (players.length === 0) {
    return { kind: 'empty' };
  }

  return { kind: 'players', players };
}
