import * as micro_streaming from '@journeyapps/micro-streaming';
import * as micro_errors from '@journeyapps/micro-errors';
import * as stream from 'stream';
import * as sdk from '../src';
// @ts-ignore
import nock from 'nock';
import { describe, test, expect } from 'vitest';

describe('network requests', () => {
  const client = sdk.createNodeNetworkClient();

  test('it should properly stream input and output', async () => {
    const data = [Buffer.from('this '), Buffer.from('is '), Buffer.from('some data')];

    nock('http://test/')
      .post('/', Buffer.concat(data))
      .reply(200, (_, requestBody) => {
        return requestBody;
      });

    const res = await client.request('http://test/', {
      method: 'post',
      body: new sdk.RawStream(data)
    });

    const response_data = Buffer.concat((await micro_streaming.drain(await res.stream())) as Buffer[]).toString();
    expect(response_data).toEqual(Buffer.concat(data).toString());
  });

  test('it should properly decode standard service responses', async () => {
    const success_data = {
      success: true
    };

    const error_data: micro_errors.ErrorData = {
      code: 'FAILURE',
      name: 'GenericFailure',
      description: 'example failure'
    };

    nock('http://test/')
      .get('/success')
      .reply(200, {
        data: success_data
      })
      .get('/failure')
      .reply(401, {
        error: error_data
      });

    const success = await client.request('http://test/success', {
      method: 'get'
    });
    expect(await success.decode()).toEqual(success_data);

    const failure = await client.request('http://test/failure', {
      method: 'get'
    });

    const failed_decode = failure.decode();
    await expect(failed_decode).rejects.toThrow(micro_errors.JourneyError);

    const error = (await failed_decode.catch((err) => err)) as micro_errors.JourneyError;
    expect(error.toJSON()).toEqual(error_data);
  });

  test('it should handle unparsable responses', async () => {
    nock('http://test/').get('/').reply(500, 'this is an unparsable response', {
      'Content-Type': 'text/plain'
    });

    const res = await client.request('http://test/', {
      method: 'get'
    });

    await expect(res.decode()).rejects.toThrow(sdk.UnparsableServiceResponse);
  });

  test('it should use custom decoders', async () => {
    const response = 'this is some custom data';
    nock('http://test/').get('/').reply(200, response);

    const res = await client.request('http://test/', {
      method: 'get',
      decoder: async (response) => {
        const test = await response.text();
        return test.toUpperCase();
      }
    });

    await expect(await res.decode()).toEqual(response.toUpperCase());
  });

  test('it should throw an error when given an unsupported body', async () => {
    const res = client.request('http://test/', {
      method: 'post',
      headers: {
        [sdk.Header.ContentType]: 'Unknown'
      },
      body: {
        key: 'Unsupported'
      }
    });

    await expect(res).rejects.toEqual(
      new Error(
        'Unsupported body with type object and a Content-Type of Unknown. None of the configured codecs know how to convert the given body to a Buffer or string. Please provide a compatible codec'
      )
    );
  });

  test('it should use a custom encoder configured on the request', async () => {
    nock('http://test/').post('/', 'request-encoded:data').reply(200, {
      data: true
    });

    const client = sdk.createNodeNetworkClient({
      codecs: {
        'application/custom': {
          encode: (data) => `client-encoded:${data}`,
          decode: (data) => Buffer.from(data).toString()
        }
      }
    });

    const res = await client.request('http://test/', {
      method: 'post',
      headers: {
        [sdk.Header.ContentType]: 'application/custom'
      },
      body: 'data',
      encoder: (data) => `request-encoded:${data}`
    });

    await expect(await res.decode()).toEqual(true);
  });

  test('it should use custom decoder configured on the client', async () => {
    const response = 'this is some custom data';
    nock('http://test/').get('/').reply(200, response);

    const client = sdk.createNodeNetworkClient({
      decoder: async (response) => {
        const test = await response.text();
        return test.toUpperCase();
      }
    });

    const res = await client.request('http://test/', {
      method: 'get'
    });

    await expect(await res.decode()).toEqual(response.toUpperCase());
  });

  test('it should use custom codec decoders configured on the client', async () => {
    const response = 'this is some custom codec data';
    nock('http://test/').get('/').reply(200, response, {
      'Content-Type': 'application/custom; charset=utf-8'
    });

    const client = sdk.createNodeNetworkClient({
      codecs: {
        'application/custom': {
          encode: (data) => String(data),
          decode: (data) => {
            return {
              data: Buffer.from(data).toString().toUpperCase()
            };
          }
        }
      }
    });

    const res = await client.request('http://test/', {
      method: 'get'
    });

    await expect(await res.decode()).toEqual(response.toUpperCase());
  });

  test('it should support custom headers', async () => {
    const response = 'this is some custom data';
    nock('http://test1/')
      .get('/')
      .reply(200, response, {
        test1: (req) => (req.getHeader('test1') as any).toString()
      });
    nock('http://test2/')
      .get('/')
      .reply(200, response, {
        test2: (req) => (req.getHeader('test2') as any).toString()
      });
    nock('http://test3/')
      .get('/')
      .reply(200, response, {
        test3: (req) => (req.getHeader('test3') as any).toString()
      });

    const headerFunction = await sdk.constructHeaders([
      {
        test1: 'a'
      },
      () => {
        return { test2: 'b' };
      },
      async () => {
        await new Promise((r) => {
          setTimeout(r, 100);
        });
        return {
          test3: 'c'
        };
      }
    ])();

    expect(headerFunction).toEqual(
      expect.objectContaining({
        test1: 'a',
        test2: 'b',
        test3: 'c'
      })
    );

    const res1 = await client.request('http://test1/', {
      method: 'get',
      headers: {
        test1: 'a'
      }
    });

    expect(res1.response.headers.get('test1')).toEqual('a');

    const res2 = await client.request('http://test2/', {
      method: 'get',
      headers: () => {
        return {
          test2: 'b'
        };
      }
    });

    expect(res2.response.headers.get('test2')).toEqual('b');

    const res3 = await client.request('http://test3/', {
      method: 'get',
      headers: async () => {
        await new Promise((r) => {
          setTimeout(r, 100);
        });
        return {
          test3: 'c'
        };
      }
    });

    expect(res3.response.headers.get('test3')).toEqual('c');
  });

  test('it should retry on 500 errors', async () => {
    let attempt = 0;
    nock('http://test/')
      .get('/')
      .reply(() => {
        attempt++;
        return [500, 'failure'];
      })
      .get('/')
      .reply(() => {
        attempt++;
        return [200, { data: 'success' }];
      })
      .get('/')
      .reply(() => {
        return [500, 'failure'];
      });

    const res = await client.request('http://test/', {
      method: 'get',
      retryable: true
    });

    expect(res.response.status).toBe(200);
    await expect(await res.decode()).toEqual('success');
    expect(attempt).toBe(2);

    const res2 = await client.request('http://test/', {
      method: 'get'
    });
    expect(res2.response.status).toBe(500);
  });

  test('it should timeout', async () => {
    nock('http://test/').get('/').delay(2000).reply(200, 'success');

    const res = client.request('http://test/', {
      method: 'get',
      timeout: 50
    });

    await expect(res).rejects.toThrow(sdk.TimeoutError);
    nock.abortPendingRequests();
  });

  test('it should not timeout when set to 0', async () => {
    nock('http://test/').get('/').delay(2000).reply(200, 'success');

    const res = await client.request('http://test/', {
      decoder: () => 'data',
      method: 'get',
      timeout: 0
    });

    await expect(await res.decode()).toBeTruthy();
  });

  test('it should timeout when not receiving streamed data', async () => {
    let i = 0;

    nock('http://test/')
      .get('/')
      .reply(200, () => {
        const transform = new stream.Transform({
          transform(chunk, _, callback) {
            callback(null, chunk);
          }
        });

        const id = setInterval(() => {
          i++;
          if (i === 4) {
            clearInterval(id);
            setTimeout(() => {
              transform.push(null);
            }, 500);
            return;
          }

          transform.push('data');
        }, 150);

        return transform;
      });

    const res = await client.request('http://test/', {
      method: 'get',
      read_timeout: 200
    });

    const body = await res.stream();
    const reader = body.getReader();

    void (async function () {
      try {
        while (!(await reader.read()).done) {}
      } catch (err) {}
    })();

    await expect(reader.closed).rejects.toThrow(sdk.TimeoutError);
    expect(i).toBe(4);
    nock.abortPendingRequests();
  });
});
