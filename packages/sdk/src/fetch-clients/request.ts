import * as micro_streaming from '@journeyapps/micro-streaming';
import * as defs from '../definitions';
import { Codec } from '../definitions';
import * as streaming from '../streaming';
import * as codecs from './codecs';
import * as decoders from './decoders';
import * as errors from './errors';

export type FetchParams = {
  method: string;
  body?: any;

  headers: defs.Headers;
  signal: AbortSignal;
};

export type CoreRequestParams<R extends defs.TResponse> = defs.RequestParams<R, any> &
  defs.NetworkClientParams<R> & {
    request: (url: string, params: FetchParams) => Promise<R>;
  };

const defaultRetryStrategy: defs.RetryStrategy = (attempt) => {
  return attempt * 200;
};

const createTimeout = (handler: () => void, timeout: number) => {
  let t = setTimeout(handler, timeout);
  let cleared = false;

  return {
    clear: () => {
      if (cleared) {
        return;
      }
      clearTimeout(t);
      cleared = true;
    },
    heartbeat: () => {
      if (cleared) {
        return;
      }
      clearTimeout(t);
      t = setTimeout(handler, timeout);
    }
  };
};

export const request = async <R extends defs.TResponse>(
  url: string,
  params: CoreRequestParams<R>,
  attempt = 0
): Promise<defs.NetworkResponse<R>> => {
  let headers: defs.Headers;
  if (typeof params.headers === 'function') {
    headers = await params.headers();
  } else {
    headers = {
      ...(params.headers || {})
    };
  }

  headers = {
    [defs.Header.Accept]: '*/*',
    ...headers
  };

  if (params.user_agent) {
    headers[defs.Header.UserAgent] = params.user_agent;
  }

  let body;
  if (params.body) {
    if (streaming.isStreamedPayload(params.body)) {
      body = params.body.encode();
    } else {
      const content_type = headers[defs.Header.ContentType] || defs.ContentType.JSON;
      headers[defs.Header.ContentType] = content_type;

      if (params.encoder) {
        body = params.encoder(params.body);
      } else if (params.codecs?.[content_type]) {
        const codec: Codec = params.codecs?.[content_type];
        body = codec.encode(params.body);
      } else if (codecs.DEFAULT_CODECS[content_type]) {
        const codec: Codec = codecs.DEFAULT_CODECS[content_type];
        body = codec.encode(params.body);
      } else {
        if (!Buffer.isBuffer(params.body) && typeof params.body !== 'string') {
          throw new Error(
            `Unsupported body with type ${typeof params.body} and a Content-Type of ${content_type}. None of the configured codecs know how to convert the given body to a Buffer or string. Please provide a compatible codec`
          );
        }

        body = params.body;
      }
    }
  }

  const retryStrategy = params.retry_strategy || defaultRetryStrategy;
  const abort_controller = new AbortController();

  const timeout = params.timeout ?? 60000;
  const read_timeout = params.read_timeout ?? 20000;

  let request_timeout;
  if (timeout > 0) {
    request_timeout = createTimeout(() => {
      abort_controller.abort();
    }, timeout);
  }

  const decoder: defs.ResponseDecoder<R> = params.decoder || decoders.buildServiceResponseDecoder(params.codecs);
  const max_attempts = (params.retry_attempts ?? 1) - 1;

  try {
    const res = await params.request(url, {
      signal: abort_controller.signal,

      method: params.method,
      headers: headers,
      body: body
    });

    // We throw here for it to be handled by the retry logic
    if (res.status >= 500 && params.retryable) {
      if (attempt <= max_attempts) {
        throw res;
      }
    }

    request_timeout?.clear();

    const request_metadata = {
      url,
      method: params.method.toUpperCase()
    };

    return {
      response: res,
      stream: async () => {
        if (res.status >= 300) {
          throw await decoder(res, request_metadata);
        }

        let stream_timeout: ReturnType<typeof createTimeout> | undefined;

        return micro_streaming.readableFrom(res.body).pipeThrough(
          new micro_streaming.compat.Transform({
            start(controller) {
              if (read_timeout <= 0) {
                return;
              }
              stream_timeout = createTimeout(() => {
                controller.error(new errors.TimeoutError());
              }, read_timeout);
            },
            transform(chunk, controller) {
              stream_timeout?.heartbeat();
              controller.enqueue(chunk);
            },
            flush() {
              stream_timeout?.clear();
            }
          })
        );
      },
      decode: () => decoder(res, request_metadata)
    };
  } catch (err) {
    request_timeout?.clear();

    if (!params.retryable || attempt > max_attempts) {
      if (err.name === 'AbortError') {
        throw new errors.TimeoutError();
      }
      throw err;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, retryStrategy(attempt));
    });

    return request(url, params, attempt + 1);
  }
};
