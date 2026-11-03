import assert from 'node:assert/strict';
import test from 'node:test';
import { recordFailedAttempt } from './loginRateLimiter.mjs';

test('counts concurrent failed attempts without losing increments', async () => {
  const attempts = new Map();
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      Promise.resolve(recordFailedAttempt(attempts, '192.0.2.1', 1000, 3, 20 * 60 * 1000))
    )
  );

  assert.deepEqual(results.map((result) => result.attempts), [1, 2, 3, 3, 3]);
  assert.equal(results.filter((result) => result.isLocked).length, 3);
  assert.equal(attempts.get('192.0.2.1').attempts, 3);
});

test('starts a new failure window after an expired lockout', () => {
  const attempts = new Map([['192.0.2.1', { attempts: 3, lockedUntil: 500 }]]);

  const result = recordFailedAttempt(attempts, '192.0.2.1', 500, 3, 20 * 60 * 1000);

  assert.deepEqual(result, { attempts: 1, lockedUntil: null, isLocked: false });
});
