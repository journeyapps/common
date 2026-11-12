import { StreamPayload } from '../streaming.js';
import * as endpoints from './endpoints.js';
import * as defs from '../definitions.js';

export class CoreSDKClient<C extends defs.NetworkClient> {
  constructor(
    readonly client: C,
    readonly endpoint: string
  ) {}
}

export type SDKClientOptions<C> = {
  endpoint: string;
  client: C;
};

export type PartialEndpoint<C extends defs.NetworkClient> = Omit<
  endpoints.CreateEndpointOptions<C>,
  'client' | 'endpoint'
>;

export class SDKClient<C extends defs.NetworkClient> extends CoreSDKClient<C> {
  constructor(options: SDKClientOptions<C>) {
    super(options.client, options.endpoint);
  }

  createEndpoint = <I extends void | {} | StreamPayload<any, any, any>, O>(
    params: PartialEndpoint<C> | ((payload: I) => PartialEndpoint<C>)
  ) => {
    return endpoints.createEndpoint<I, O, C>((payload) => {
      let resolved_params;
      if (typeof params === 'function') {
        resolved_params = params(payload);
      } else {
        resolved_params = params;
      }

      return {
        client: this.client,
        endpoint: this.endpoint,
        ...resolved_params
      };
    });
  };
}
