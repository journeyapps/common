import { afterEach, expect, test, vi } from 'vitest';
import { createWebNetworkClient, RawStream, Header } from '@journeyapps/common-sdk/web';

afterEach(() => vi.unstubAllGlobals());

test.each([false, 0, '', { name: 'example' }])('encodes JSON request body %j', async (body) => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ data: true }));
  vi.stubGlobal('fetch', fetch);
  const response = await createWebNetworkClient().request('https://example.test/', { method: 'POST', body });
  expect(fetch.mock.calls[0][1].body).toBe(JSON.stringify(body));
  await expect(response.decode()).resolves.toBe(true);
});

test('sends binary request bodies without a global Buffer', async () => {
  vi.stubGlobal('Buffer', undefined);
  const fetch = vi.fn().mockResolvedValue(Response.json({ data: true }));
  vi.stubGlobal('fetch', fetch);
  const body = new Uint8Array([1, 2, 3]);
  await createWebNetworkClient().request('https://example.test/', {
    method: 'POST',
    body,
    headers: { [Header.ContentType]: 'application/octet-stream' }
  });
  expect(fetch.mock.calls[0][1].body).toEqual(body);
});

test('buffers raw stream chunks without a global Buffer', async () => {
  vi.stubGlobal('Buffer', undefined);
  const fetch = vi.fn().mockResolvedValue(Response.json({ data: true }));
  vi.stubGlobal('fetch', fetch);
  await createWebNetworkClient().request('https://example.test/', {
    method: 'POST',
    body: new RawStream([new Uint8Array([1, 2]), new Uint8Array([3])] as any),
    headers: { [Header.ContentType]: 'application/octet-stream' }
  });
  expect(fetch.mock.calls[0][1].body).toEqual(new Uint8Array([1, 2, 3]));
});
