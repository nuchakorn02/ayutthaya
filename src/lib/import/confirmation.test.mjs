import test from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintSource, fingerprintComparisonState, signConfirmationContext, verifyConfirmationContext } from './confirmation.mjs';

test('fingerprintSource is deterministic', () => {
  const bytes = new TextEncoder().encode('hello');
  assert.equal(fingerprintSource(bytes), fingerprintSource(bytes));
});

test('fingerprintComparisonState is deterministic', () => {
  const state = { players: [{ id: 'a', score: 1 }, { id: 'b', score: 2 }] };
  assert.equal(fingerprintComparisonState(state), fingerprintComparisonState(state));
});

test('confirmationContext rejects tampering and expiry', () => {
  const secret = 'super-secret';
  const now = Date.now();
  const sourceFp = fingerprintSource(new TextEncoder().encode('source'));
  const comparisonFp = fingerprintComparisonState({ players: [] });
  const token = signConfirmationContext(sourceFp, comparisonFp, now + 60_000, secret);

  assert.ok(verifyConfirmationContext(token, secret, sourceFp, comparisonFp, now));
  assert.ok(!verifyConfirmationContext(token, secret, sourceFp, comparisonFp, now + 120_000));
  assert.ok(!verifyConfirmationContext(token, 'wrong-secret', sourceFp, comparisonFp, now));
  assert.ok(!verifyConfirmationContext(token + 'x', secret, sourceFp, comparisonFp, now));
});

test('confirmationContext rejects changed source or comparison fingerprint', () => {
  const secret = 'super-secret';
  const now = Date.now();
  const sourceFp = fingerprintSource(new TextEncoder().encode('source'));
  const comparisonFp = fingerprintComparisonState({ players: [] });
  const token = signConfirmationContext(sourceFp, comparisonFp, now + 60_000, secret);

  const otherSourceFp = fingerprintSource(new TextEncoder().encode('other'));
  const otherComparisonFp = fingerprintComparisonState({ players: [{ id: 'a' }] });

  assert.ok(!verifyConfirmationContext(token, secret, otherSourceFp, comparisonFp, now));
  assert.ok(!verifyConfirmationContext(token, secret, sourceFp, otherComparisonFp, now));
});
