import type * as stream from 'stream/web';
import * as streaming from './streaming';

export type ResponseDecoder<R extends TResponse = TResponse> = (
  response: R,
  request_context: RequestMetadata
) => Promise<any> | any;

export type RequestEncoder<T = any> = (data: T) => string | Uint8Array;

export type Codec<T = any> = {
  encode: RequestEncoder<T>;
  decode: (data: Uint8Array | ArrayBuffer) => T;
};

export type Codecs = Record<string, Codec>;

export interface Transcoding<Decoded = any, Encoded = any> {
  encode?: (value: Decoded) => Encoded;
  decode?: (value: Encoded) => Decoded;
}

export type RetryStrategy = (attempt: number) => number;

export enum Header {
  ContentType = 'Content-Type',
  Accept = 'Accept',

  Authorization = 'Authorization',

  UserAgent = 'User-Agent'
}
export type Headers = Partial<Record<Header, string>> & Record<string, string>;

export type HeaderCollector = (() => Headers) | (() => Promise<Headers>);

export type RequestHeaders = Headers | HeaderCollector;

export enum ContentType {
  JSON = 'application/json',
  BSON = 'application/bson',
  HeaderStream = 'application/vnd.journeyapps.raw+header',
  BSONStream = 'application/vnd.journeyapps.bson-stream+header'
}

export enum METHOD {
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  GET = 'GET',
  DELETE = 'DELETE'
}

export type StringMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

type ResponseHeaders = {
  get(key: string): string | null;
};
export type TResponse = {
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;

  status: number;
  body: any;

  headers: ResponseHeaders;
};

export type RequestMetadata = {
  url: string;
  method: string;
};

export type CommonRequestParams<R extends TResponse = TResponse> = {
  /**
   * Maximum amount of time allowed to receive a response to a request
   *
   * Set to 0 to disable
   *
   * @default 60000
   */
  timeout?: number;

  /**
   * Maximum amount of time between two consecutive bytes read on a stream. Only applies to
   * streamed responses.
   *
   * Set to 0 to disable
   *
   * @default 20000
   */
  read_timeout?: number;

  retry_attempts?: number;
  retry_strategy?: RetryStrategy;

  headers?: RequestHeaders;
  decoder?: ResponseDecoder<R>;
  transcoding?: Transcoding;
};

export type RequestParams<R extends TResponse, T> = CommonRequestParams<R> & {
  method: METHOD | StringMethod;
  body?: T | streaming.StreamPayload<any, any, any>;
  encoder?: RequestEncoder<T>;

  retryable?: boolean;
};

export type NetworkClientParams<R extends TResponse = TResponse> = CommonRequestParams<R> & {
  user_agent?: string;
  codecs?: Codecs;
};

export type NetworkResponse<T extends TResponse, O = any> = {
  response: T;

  /**
   * Decode the response using the configured default decoder
   */
  decode: <T = O>() => Promise<T>;
  stream: () => Promise<stream.ReadableStream<Buffer>>;
};

export type NetworkClient<I = any, O extends NetworkResponse<any> = NetworkResponse<any>> = {
  augment: <C extends NetworkClient<I, O>>(options: Partial<NetworkClientParams>) => C;
  request: (url: string, params: RequestParams<ExtractNativeResponseFromNetworkResponse<O>, I>) => Promise<O>;
};

export type ExtractNetworkResponseFromNetworkClient<T extends NetworkClient> =
  T extends NetworkClient<any, infer R> ? R : never;

export type ExtractNativeResponseFromNetworkResponse<T extends NetworkResponse<any>> =
  T extends NetworkResponse<infer R> ? R : never;

export type ExtractNativeResponse<C extends NetworkClient> = ExtractNativeResponseFromNetworkResponse<
  ExtractNetworkResponseFromNetworkClient<C>
>;

export type ExtractBody<C extends NetworkClient> = Exclude<ExtractNativeResponse<C>['body'], null>;
