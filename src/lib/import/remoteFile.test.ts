import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedImportUrl, downloadImportFile } from './remoteFile.ts';

function mockResponse(body: BodyInit | null, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

describe('isAllowedImportUrl', () => {
  it('accepts approved Microsoft sharing hosts', () => {
    assert.equal(isAllowedImportUrl('https://1drv.ms/x/s!abc').hostname, '1drv.ms');
    assert.equal(isAllowedImportUrl('https://onedrive.live.com/...').hostname, 'onedrive.live.com');
    assert.equal(isAllowedImportUrl('https://graph.microsoft.com/v1.0/...').hostname, 'graph.microsoft.com');
    assert.equal(isAllowedImportUrl('https://example.sharepoint.com/file').hostname, 'example.sharepoint.com');
    assert.equal(isAllowedImportUrl('https://sub.1drv.com/file').hostname, 'sub.1drv.com');
  });

  it('rejects HTTP', () => {
    assert.throws(() => isAllowedImportUrl('http://1drv.ms/x'), /HTTPS/);
  });

  it('rejects unapproved hosts', () => {
    assert.throws(() => isAllowedImportUrl('https://example.com/file'), /approved/);
    assert.throws(() => isAllowedImportUrl('https://evil1drv.ms/file'), /approved/);
  });

  it('rejects loopback and private hosts', () => {
    assert.throws(() => isAllowedImportUrl('https://127.0.0.1/file'), /private|loopback/);
    assert.throws(() => isAllowedImportUrl('https://192.168.1.1/file'), /private|loopback/);
    assert.throws(() => isAllowedImportUrl('https://localhost/file'), /private|loopback/);
  });
});

describe('downloadImportFile', () => {
  it('follows redirects up to five times', async () => {
    let calls = 0;
    const fetcher = async (_url: string | URL, _init?: RequestInit): Promise<Response> => {
      calls++;
      if (calls < 5) {
        return mockResponse(null, {
          status: 302,
          headers: { location: `https://1drv.ms/step${calls}` },
        });
      }
      return mockResponse('final', { status: 200, headers: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment; filename="book.xlsx"' } });
    };

    const result = await downloadImportFile('https://1drv.ms/start', fetcher as typeof fetch);
    assert.equal(calls, 5);
    assert.equal(result.finalUrl.hostname, '1drv.ms');
    assert.equal(result.contentType, 'application/octet-stream');
    assert.equal(result.contentDisposition, 'attachment; filename="book.xlsx"');
  });

  it('rejects a sixth redirect', async () => {
    let calls = 0;
    const fetcher = async (_url: string | URL, _init?: RequestInit): Promise<Response> => {
      calls++;
      return mockResponse(null, {
        status: 302,
        headers: { location: `https://1drv.ms/step${calls}` },
      });
    };

    await assert.rejects(
      () => downloadImportFile('https://1drv.ms/start', fetcher as typeof fetch),
      /redirects/
    );
  });

  it('rejects Content-Length over 10 MB', async () => {
    const fetcher = async () =>
      mockResponse(null, {
        status: 200,
        headers: { 'content-length': String(11 * 1024 * 1024) },
      });

    await assert.rejects(
      () => downloadImportFile('https://1drv.ms/big', fetcher as typeof fetch),
      /10 MB/
    );
  });

  it('rejects a streamed body exceeding 10 MB', async () => {
    const fetcher = async () => {
      const encoder = new TextEncoder();
      const chunk = encoder.encode('x'.repeat(1024 * 1024));
      let sent = 0;
      const stream = new ReadableStream({
        pull(controller) {
          if (sent >= 11) {
            controller.close();
            return;
          }
          controller.enqueue(chunk);
          sent++;
        },
      });
      return mockResponse(stream, { status: 200 });
    };

    await assert.rejects(
      () => downloadImportFile('https://1drv.ms/bigstream', fetcher as typeof fetch),
      /10 MB/
    );
  });

  it('aborts after the configured timeout', async () => {
    const fetcher = async (_url: string | URL, init?: RequestInit) => {
      assert.ok(init?.signal, 'expected an AbortSignal');
      // Simulate a request that never resolves before the signal aborts.
      return new Promise<Response>((_, reject) => {
        const onAbort = () => reject(new DOMException('AbortError', 'AbortError'));
        if (init.signal?.aborted) {
          onAbort();
          return;
        }
        init.signal?.addEventListener('abort', onAbort, { once: true });
      });
    };

    await assert.rejects(
      () => downloadImportFile('https://1drv.ms/slow', fetcher as typeof fetch, 10),
      /AbortError|timed out/
    );
  });

  it('redacts query strings from final URL reporting', async () => {
    const fetcher = async () =>
      mockResponse('ok', {
        status: 200,
        headers: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment; filename="book.xlsx"' },
      });

    const result = await downloadImportFile('https://1drv.ms/file?token=secret', fetcher as typeof fetch);
    assert.equal(result.contentType, 'application/octet-stream');
    assert.equal(result.finalUrl.search, '');
    assert.equal(result.finalUrl.href, 'https://1drv.ms/file');
  });
});
