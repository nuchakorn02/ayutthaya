type ActivePlayersOutcome<T> =
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'players'; players: T[] };

export function getActivePlayersOutcome<T>(
  players: T[] | null,
  error: { message: string } | null
): ActivePlayersOutcome<T>;
