import * as micro_streaming from '@journeyapps/micro-streaming';
import * as defs from '../definitions.js';
import { RequestParams } from '../definitions.js';
import * as streaming from '../streaming.js';
import * as utils from '../utils.js';
import * as requester from './request.js';
import { FetchParams } from './request.js';

export type WebRequestInput = ReadableStream | any;
export type WebNetworkResponse = defs.NetworkResponse<Response>;
export type WebNetworkClient = defs.NetworkClient<WebRequestInput, WebNetworkResponse>;

export async function* iterableFromReadable(readable: ReadableStream) {
  const reader = readable.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export type WebNetworkClientOptions = defs.NetworkClientParams<Response> & {
  /**
   * If true then streams will buffered into a UInt8Array before being sent over network
   *
   * @default true
   */
  buffer_streams?: boolean;
};

export const createWebNetworkClient = (options?: WebNetworkClientOptions): WebNetworkClient => {
  return {
    augment: <C extends WebNetworkClient>(augmented: Partial<defs.NetworkClientParams<Response>>) => {
      return createWebNetworkClient({ ...augmented, ...options }) as C;
    },
    request: async (url: string, params: RequestParams<Response, any>) => {
      let headers = {};
      let body;
      if (params.body !== undefined && params.body !== null) {
        if (streaming.isStreamedPayload(params.body)) {
          if (options?.buffer_streams ?? true) {
            const chunks = await micro_streaming.drain(streaming.ensureIterable(params.body.encode()));
            const bytes = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
            let offset = 0;
            for (const chunk of chunks) {
              bytes.set(chunk, offset);
              offset += chunk.byteLength;
            }
            body = bytes;
          } else {
            body = new streaming.RawStream(micro_streaming.readableFrom(params.body.encode()));
          }
          headers = streaming.headersForStream(params.body);
        } else {
          body = params.body;
        }
      }

      return requester.request(url, {
        ...(options || {}),
        ...params,
        headers: utils.constructHeaders([headers, params.headers, options?.headers]),
        user_agent: options?.user_agent,
        body: body,

        request: async (url: string, params: FetchParams): Promise<Response> => {
          return await fetch(url, params);
        }
      });
    }
  };
};
