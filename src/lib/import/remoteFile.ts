/**
 * Remote import file fetching with SSRF / DoS guards.
 *
 * Allowed destinations are limited to Microsoft file-sharing hosts over HTTPS.
 * Manual redirect handling enforces an allowlist, a redirect limit, a per-request
 * timeout, and a 10 MB streamed response limit.
 */

const ALLOWED_HOSTS = new Set([
  '1drv.ms',
  'onedrive.live.com',
  'graph.microsoft.com',
]);

const ALLOWED_SUBDOMAINS = new Set([
  'sharepoint.com',
  '1drv.com',
]);

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB
const DEFAULT_TIMEOUT_MS = 15_000;

function isPrivateHost(hostname: string): boolean {
  // Reject loopback and IP literals entirely for imports.
  if (hostname === 'localhost') return true;

  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    const parts = hostname.split('.').map(Number);
    // 127.0.0.0/8
    if (parts[0] === 127) return true;
    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 link-local
    if (parts[0] === 169 && parts[1] === 254) return true;
    return false;
  }

  // IPv6 literals
  if (hostname.startsWith('[')) {
    const inner = hostname.slice(1, -1).toLowerCase();
    if (inner === '::1' || inner === '0:0:0:0:0:0:0:1') return true;
    if (inner.startsWith('fc') || inner.startsWith('fd')) return true; // unique local
    if (inner.startsWith('fe80:')) return true; // link-local
    if (inner === '::') return true;
  }

  return false;
}

export function isAllowedImportUrl(value: string | URL): URL {
  const url = typeof value === 'string' ? new URL(value) : value;

  if (url.protocol !== 'https:') {
    throw new Error(`Remote imports must use HTTPS (got ${url.protocol})`);
  }

  const hostname = url.hostname.toLowerCase();

  if (isPrivateHost(hostname)) {
    throw new Error(`Remote imports are not allowed from private or loopback hosts`);
  }

  if (ALLOWED_HOSTS.has(hostname)) {
    return url;
  }

  const rootDomain = hostname.split('.').slice(-2).join('.');
  if (ALLOWED_SUBDOMAINS.has(rootDomain)) {
    return url;
  }

  throw new Error(`Remote imports are only allowed from approved Microsoft sharing hosts (got ${hostname})`);
}

export interface DownloadImportFileOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

export interface DownloadedImportFile {
  buffer: ArrayBuffer;
  contentType: string;
  contentDisposition: string;
  finalUrl: URL;
}

export async function downloadImportFile(
  url: string | URL,
  fetcher: typeof fetch = fetch,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<DownloadedImportFile> {

  let currentUrl = isAllowedImportUrl(url);
  let redirects = 0;

  while (true) {
    if (redirects > MAX_REDIRECTS) {
      throw new Error(`Too many redirects while downloading import file (limit: ${MAX_REDIRECTS})`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetcher(currentUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LeaderboardBot/1.0)',
        },
        // Manual redirect handling so each hop can be validated.
        redirect: 'manual',
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect response missing Location header from ${currentUrl.origin}`);
      }
      currentUrl = isAllowedImportUrl(new URL(location, currentUrl));
      redirects++;
      continue;
    }

    if (!response.ok) {
      throw new Error(`Download failed from ${currentUrl.origin}: HTTP ${response.status}`);
    }

    // Preflight Content-Length check.
    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
        throw new Error(`Import file exceeds maximum size of 10 MB`);
      }
    }

    // Streamed byte limit.
    const body = response.body;
    if (!body) {
      throw new Error(`Empty response body from ${currentUrl.origin}`);
    }

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.length;
        if (totalBytes > MAX_BODY_BYTES) {
          throw new Error(`Import file exceeds maximum size of 10 MB`);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Flatten chunks into a single ArrayBuffer.
    const concatenated = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }

    // Strip query string from final URL so callers never log credentials.
    const safeFinalUrl = new URL(currentUrl);
    safeFinalUrl.search = '';

    return {
      buffer: concatenated.buffer.slice(concatenated.byteOffset, concatenated.byteOffset + concatenated.byteLength),
      contentType: response.headers.get('content-type') || '',
      contentDisposition: response.headers.get('content-disposition') || '',
      finalUrl: safeFinalUrl,
    };
  }
}
