/**
 * @param {string} rawUrl
 * @returns {string}
 */
export function getLogSafeUrlOrigin(rawUrl) {
  try {
    return new URL(rawUrl).origin;
  } catch (error) {
    if (error instanceof TypeError) {
      return '[invalid URL]';
    }
    throw error;
  }
}
