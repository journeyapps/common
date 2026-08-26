import * as defs from '../definitions';
import { StreamPayload } from '../streaming';
import * as endpoints from './endpoints';
import { CoreSDKClient, PartialEndpoint, SDKClientOptions } from './sdk-client';
import * as t from 'ts-codec';

/** Extract the decoded domain value accepted or returned by a transcoding codec. */
export type Decoded<C extends t.AnyCodec> = t.Decoded<C>;

/** Infer a decoded domain value when a codec is present, otherwise use void. */
export type DecodedOrVoid<C extends t.AnyCodec | undefined> = C extends t.AnyCodec ? Decoded<C> : void;

/** Optional request and response codecs for a codec endpoint. */
export type EndpointCodecs<
  RequestCodec extends t.AnyCodec | undefined,
  ResponseCodec extends t.AnyCodec | undefined
> = {
  request?: RequestCodec;
  response?: ResponseCodec;
};

/** Static configuration for an endpoint whose boundary representations are codec-backed. */
export type StaticCodecEndpointOptions<
  C extends defs.NetworkClient,
  RequestCodec extends t.AnyCodec | undefined,
  ResponseCodec extends t.AnyCodec | undefined
> = Omit<PartialEndpoint<C>, 'transcoding'> & {
  codecs: EndpointCodecs<RequestCodec, ResponseCodec>;
};

/** Static or payload-derived configuration accepted when creating a codec endpoint. */
export type CodecEndpointOptions<
  C extends defs.NetworkClient,
  RequestCodec extends t.AnyCodec | undefined,
  ResponseCodec extends t.AnyCodec | undefined,
  Payload
> =
  | StaticCodecEndpointOptions<C, RequestCodec, ResponseCodec>
  | ((payload: Payload) => StaticCodecEndpointOptions<C, RequestCodec, ResponseCodec>);

/**
 * An SDK client whose endpoints declare codecs for the request and response
 * values they use. An omitted request or response codec represents void.
 * Serialized transports apply the generated transcoding callbacks, while direct
 * transports may pass decoded values through without invoking them.
 */
export class CodecSDKClient<C extends defs.NetworkClient> extends CoreSDKClient<C> {
  constructor(options: SDKClientOptions<C>) {
    super(options.client, options.endpoint);
  }

  /** Create an endpoint whose input and output types are inferred from its codecs. */
  createEndpoint = <
    RequestCodec extends t.AnyCodec | undefined = undefined,
    ResponseCodec extends t.AnyCodec | undefined = undefined,
    I extends void | {} | StreamPayload<any, any, any> = DecodedOrVoid<RequestCodec>,
    O = DecodedOrVoid<ResponseCodec>
  >(
    params: CodecEndpointOptions<C, RequestCodec, ResponseCodec, I>
  ) => {
    return endpoints.createEndpoint<I, O, C>((payload) => {
      const resolved_params = typeof params === 'function' ? params(payload) : params;
      const { codecs, ...endpoint_params } = resolved_params;

      return {
        client: this.client,
        endpoint: this.endpoint,
        ...endpoint_params,
        transcoding: {
          encode: codecs.request ? (value) => codecs.request!.encode(value) : undefined,
          decode: codecs.response ? (value) => codecs.response!.decode(value) : () => undefined
        }
      };
    });
  };
}
