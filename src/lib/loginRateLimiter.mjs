export function recordFailedAttempt(attemptsByIp, ip, now, maxAttempts, lockoutMs) {
  const previous = attemptsByIp.get(ip);
  if (previous?.lockedUntil && previous.lockedUntil > now) {
    return {
      attempts: previous.attempts,
      lockedUntil: previous.lockedUntil,
      isLocked: true,
    };
  }

  const attempts = previous?.lockedUntil && previous.lockedUntil <= now
    ? 1
    : (previous?.attempts ?? 0) + 1;
  const lockedUntil = attempts >= maxAttempts ? now + lockoutMs : null;
  const result = { attempts, lockedUntil, isLocked: lockedUntil !== null };

  attemptsByIp.set(ip, { attempts, lockedUntil });
  return result;
}

export function parseLoginAttemptResult(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof value.attempts !== 'number' ||
    typeof value.is_locked !== 'boolean' ||
    typeof value.authenticated !== 'boolean' ||
    (value.locked_until !== null && typeof value.locked_until !== 'string')
  ) {
    throw new Error('Invalid admin login rate-limit response');
  }

  const lockedUntil = value.locked_until === null ? null : Date.parse(value.locked_until);
  if (lockedUntil !== null && !Number.isFinite(lockedUntil)) {
    throw new Error('Invalid admin login lockout timestamp');
  }

  return {
    attempts: value.attempts,
    lockedUntil,
    isLocked: value.is_locked,
    authenticated: value.authenticated,
  };
}
