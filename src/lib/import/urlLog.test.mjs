import assert from 'node:assert/strict';
import test from 'node:test';
import { getLogSafeUrlOrigin } from './urlLog.mjs';

test('omits sensitive path and query data from remote URL logs', () => {
  const url = 'https://1drv.ms/x/s!example-share?e=example-token';

  assert.equal(getLogSafeUrlOrigin(url), 'https://1drv.ms');
});

test('omits URL username and password from logs', () => {
  const url = 'https://user:password@example.com/private?token=example-token';

  assert.equal(getLogSafeUrlOrigin(url), 'https://example.com');
});

test('returns a safe placeholder for an invalid URL', () => {
  assert.equal(getLogSafeUrlOrigin('not a URL'), '[invalid URL]');
});
