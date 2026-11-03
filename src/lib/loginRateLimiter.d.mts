export interface LoginAttemptState {
  attempts: number;
  lockedUntil: number | null;
}

export interface LoginAttemptResult {
  attempts: number;
  lockedUntil: number | null;
  isLocked: boolean;
  authenticated?: boolean;
}

export function recordFailedAttempt(
  attemptsByIp: Map<string, LoginAttemptState>,
  ip: string,
  now: number,
  maxAttempts: number,
  lockoutMs: number
): LoginAttemptResult;

export function parseLoginAttemptResult(value: unknown): LoginAttemptResult;
