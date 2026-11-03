import type { Player } from '../types';

type PlayerScoreUpdateResult = {
  player: Player;
  old_score: number;
  new_score: number;
  score_diff: number;
};

type Rpc = (
  functionName: string,
  args: Record<string, unknown>
) => PromiseLike<{
  data: PlayerScoreUpdateResult | null;
  error: { message: string } | null;
}>;

export function persistPlayerUpdateWithHistory(
  rpc: Rpc,
  input: {
    playerId: string;
    updates: Record<string, unknown>;
    reason: string | null;
  }
): Promise<PlayerScoreUpdateResult>;
