import crypto from 'node:crypto';

/**
 * Compute a SHA-256 fingerprint of the source bytes.
 *
 * @param {ArrayBuffer} bytes
 * @returns {string}
 */
export function fingerprintSource(bytes) {
  const buf = Buffer.from(bytes);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Compute a deterministic fingerprint of the comparison state.
 *
 * @param {unknown} state
 * @returns {string}
 */
export function fingerprintComparisonState(state) {
  const canonical = JSON.stringify(state, Object.keys(state).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Sign a confirmation context so the server can verify that confirmation
 * uses the same source and comparison state as the preview.
 *
 * @param {string} sourceFingerprint
 * @param {string} comparisonFingerprint
 * @param {number} expiresAt - Unix timestamp in milliseconds
 * @param {string} secret
 * @returns {string}
 */
export function signConfirmationContext(sourceFingerprint, comparisonFingerprint, expiresAt, secret) {
  const payload = `${sourceFingerprint}|${comparisonFingerprint}|${expiresAt}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

/**
 * Verify a confirmation token and that it matches the supplied fingerprints
 * and has not expired.
 *
 * @param {string} token
 * @param {string} secret
 * @param {string} sourceFingerprint
 * @param {string} comparisonFingerprint
 * @param {number} now - Unix timestamp in milliseconds
 * @returns {boolean}
 */
export function verifyConfirmationContext(token, secret, sourceFingerprint, comparisonFingerprint, now) {
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [encodedPayload, signature] = parts;
  let payload;
  try {
    payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  } catch {
    return false;
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (!/^[0-9a-f]+$/.test(signature) || signature.length !== expectedSignature.length) {
    return false;
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
    return false;
  }

  const [src, cmp, expiresAtStr] = payload.split('|');
  if (src !== sourceFingerprint || cmp !== comparisonFingerprint) {
    return false;
  }

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || now >= expiresAt) {
    return false;
  }

  return true;
}
