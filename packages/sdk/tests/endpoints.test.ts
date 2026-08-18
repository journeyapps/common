import * as micro_streaming from '@journeyapps/micro-streaming';
import * as stream from 'stream';
import * as sdk from '../src';
import { METHOD } from '../src';
// @ts-ignore
import nock from 'nock';
import { describe, test, it, expect } from 'vitest';

describe('endpoints', () => {
  const client = sdk.createNodeNetworkClient();

  test('it should properly handle basic input and output', async () => {
    nock('http://test/').post('/', { data: 'some data' }).reply(200, { data: 'success' });

    const endpoint = sdk.createEndpoint<{ data: string }, string>({
      client,
      endpoint: 'http://test/',
      path: '/'
    });

    const res = await endpoint({ data: 'some data' });
    expect(res).toEqual('success');
  });

  test('it should allow payloads for dynamic options. but not pass them into GET requests', async () => {
    nock('http://test').get('/param', '').reply(200, { data: 'success' });

    const endpoint = sdk.createEndpoint<{ data: string }, string>((options) => {
      return {
        client,
        method: METHOD.GET,
        endpoint: `http://test/`,
        path: `/${options.data}`
      };
    });

    const res = await endpoint({ data: 'param' });
    expect(res).toEqual('success');
  });

  test('it should properly join urls', async () => {
    nock('http://test/').post('/thing/').reply(200, { data: 'success' });

    const endpoint = sdk.createEndpoint<void, string>({
      client,
      endpoint: 'http://test/',
      path: '//thing/'
    });

    const res = await endpoint();
    expect(res).toEqual('success');
  });

  test('it should stream decoded output', async () => {
    nock('http://test/')
      .post('/')
      .reply(200, () => {
        return stream.Readable.from(
          micro_streaming.readableFrom([{ a: 1 }, { a: 2 }]).pipeThrough(micro_streaming.bson.createBSONStreamEncoder())
        );
      });

    const endpoint = sdk.createEndpoint<void, { a: number }>({
      client,
      endpoint: 'http://test/',
      path: '/'
    }).streamed;

    const res = await micro_streaming.drain(await endpoint());
    expect(res).toEqual([{ a: 1 }, { a: 2 }]);
  });

  test('it should accept a bson input stream', async () => {
    nock('http://test/')
      .post('/', (body) => true, {
        reqheaders: {
          'content-type': 'application/vnd.journeyapps+stream+bson'
        }
      })
      .reply(200, { data: 'success' });

    const endpoint = sdk.createEndpoint<sdk.BsonStream<{ user_id: string }, { a: number }>, string>({
      client,
      endpoint: 'http://test/',
      path: '/'
    });

    const res = await endpoint(
      new sdk.BsonStream([{ a: 1 }], {
        user_id: '123'
      })
    );
    expect(res).toEqual('success');
  });

  test('it should accept a raw input stream', async () => {
    nock('http://test/').post('/').reply(200, { data: 'success' });

    const endpoint = sdk.createEndpoint<sdk.RawStream, string>({
      client,
      endpoint: 'http://test/',
      path: '/'
    });

    const res = await endpoint(new sdk.RawStream([Buffer.from('some data')]));
    expect(res).toEqual('success');
  });
});
