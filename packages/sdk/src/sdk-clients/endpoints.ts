import * as micro_streaming from '@journeyapps/micro-streaming';
import { StreamPayload } from '../streaming';
import type * as stream from 'stream/web';
import * as defs from '../definitions';
import { METHOD } from '../definitions';
import * as utils from '../utils';

export type CreateEndpointOptions<C extends defs.NetworkClient> = defs.CommonRequestParams & {
  client: C;

  method?: defs.METHOD | defs.StringMethod;
  endpoint: string;
  path: string;

  /**
   * Specifying this will override any params given when executing this endpoint
   */
  payload?: any;

  retryable?: boolean;
};

export type RawRequestFunction<I, C extends defs.NetworkClient> = (
  payload: I,
  options?: defs.CommonRequestParams
) => Promise<defs.ExtractNetworkResponseFromNetworkClient<C>>;

export type StreamedEndpoint<I, O, C extends defs.NetworkClient> = {
  (
    payload: I,
    options?: defs.CommonRequestParams
  ): Promise<
    AsyncIterable<O> & {
      response: defs.ExtractNativeResponse<C>;
      stream: () => Promise<stream.ReadableStream<Buffer>>;
      decode: () => Promise<stream.ReadableStream<O>>;
    }
  >;
  request: RawRequestFunction<I, C>;
};

export type Endpoint<I, O, C extends defs.NetworkClient> = {
  (payload: I, options?: defs.CommonRequestParams): Promise<O>;
  request: RawRequestFunction<I, C>;
  streamed: StreamedEndpoint<I, O, C>;
};

export const createEndpoint = <
  I extends void | {} | StreamPayload<any, any, any>,
  O,
  C extends defs.NetworkClient = defs.NetworkClient
>(
  options: CreateEndpointOptions<C> | ((payload: I) => CreateEndpointOptions<C>)
): Endpoint<I, O, C> => {
  const request = async (payload: I, override?: defs.CommonRequestParams) => {
    let request_options;
    if (typeof options === 'function') {
      request_options = options(payload);
    } else {
      request_options = options;
    }

    let method = request_options.method || defs.METHOD.POST;
    let body = request_options.payload || payload;

    /*
      In some cases we want the payload so we can dynamically construct a GET URL (`options` is a function),
      but don't want it automatically added to the body of the GET request
     */
    if (method === METHOD.GET) {
      body = null;
    }

    return await request_options.client.request(utils.join(request_options.endpoint, request_options.path), {
      method,
      ...request_options,
      body,
      ...(override || {})
    });
  };

  const defaultRequestFunction = async (params: I, override?: defs.CommonRequestParams) => {
    const res = await request(params, override);
    return res.decode<O>();
  };

  const streamedRequestFunction = async (params: I, override?: defs.CommonRequestParams) => {
    const res = await request(params, override);

    const decode = async () => {
      const stream = await res.stream();
      return stream.pipeThrough(micro_streaming.bson.createBSONStreamDecoder());
    };

    return {
      response: res.response,
      stream: res.stream,
      decode: decode,
      [Symbol.asyncIterator]: async function* () {
        yield* micro_streaming.iterableFromReadable(await decode());
      }
    };
  };

  return Object.assign(defaultRequestFunction, {
    streamed: Object.assign(streamedRequestFunction, {
      request: request as RawRequestFunction<I, C>
    }),
    request: request as RawRequestFunction<I, C>
  });
};
