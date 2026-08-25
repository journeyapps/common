import * as defs from '../definitions';
import { StreamPayload } from '../streaming';
import * as endpoints from './endpoints';
import { CoreSDKClient, PartialEndpoint, SDKClientOptions } from './sdk-client';
import * as t from 'ts-codec';

/** Extract the decoded domain value accepted or returned by a transcoding codec. */
export type Decoded<C extends t.AnyCodec> = t.Decoded<C>;

/** Request and response codecs required by a codec endpoint. */
export type EndpointCodecs<RequestCodec extends t.AnyCodec, ResponseCodec extends t.AnyCodec> = {
  request: RequestCodec;
  response: ResponseCodec;
};

/** Static configuration for an endpoint whose boundary representations are codec-backed. */
export type StaticCodecEndpointOptions<
  C extends defs.NetworkClient,
  RequestCodec extends t.AnyCodec,
  ResponseCodec extends t.AnyCodec
> = Omit<PartialEndpoint<C>, 'transcoding'> & {
  codecs: EndpointCodecs<RequestCodec, ResponseCodec>;
};

/** Static or payload-derived configuration accepted when creating a codec endpoint. */
export type CodecEndpointOptions<
  C extends defs.NetworkClient,
  RequestCodec extends t.AnyCodec,
  ResponseCodec extends t.AnyCodec,
  Payload
> =
  | StaticCodecEndpointOptions<C, RequestCodec, ResponseCodec>
  | ((payload: Payload) => StaticCodecEndpointOptions<C, RequestCodec, ResponseCodec>);

/**
 * An SDK client that requires every endpoint to declare its request and response
 * codecs. Serialized transports apply the generated transcoding callbacks,
 * while direct transports may pass decoded values through without invoking them.
 */
export class CodecSDKClient<C extends defs.NetworkClient> extends CoreSDKClient<C> {
  constructor(options: SDKClientOptions<C>) {
    super(options.client, options.endpoint);
  }

  /** Create an endpoint whose input and output types are inferred from its codecs. */
  createEndpoint = <
    RequestCodec extends t.AnyCodec,
    ResponseCodec extends t.AnyCodec,
    I extends void | {} | StreamPayload<any, any, any> = Decoded<RequestCodec>,
    O = Decoded<ResponseCodec>
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
          encode: (value) => codecs.request.encode(value),
          decode: (value) => codecs.response.decode(value)
        }
      };
    });
  };
}
