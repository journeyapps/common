import * as consumers from 'stream/consumers';
import * as streaming from '../streaming.js';
import HttpAgent from 'agentkeepalive';
import * as requester from './request.js';
import * as defs from '../definitions.js';
import * as errors from './errors.js';
import * as utils from '../utils.js';
import * as stream from 'stream';

// these imports are written this way so they work with nock
import https from 'node:https';
import http from 'node:http';

import { URL } from 'url';

export type NodeResponse = Omit<defs.TResponse, 'body'> & {
  body: http.IncomingMessage;
};

export type NodeNetworkResponse<O = any> = defs.NetworkResponse<NodeResponse, O>;
export type NodeNetworkClient = defs.NetworkClient<any, NodeNetworkResponse>;

const default_agent_options: HttpAgent.HttpOptions = {
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000, // active socket keepalive for 60 seconds
  freeSocketTimeout: 30000 // free socket keepalive for 30 seconds
};

export const createNodeNetworkClient = (options?: defs.NetworkClientParams<NodeResponse>): NodeNetworkClient => {
  const agent_options = { ...default_agent_options };
  if (options?.timeout != null) {
    agent_options.timeout = options?.timeout;
  }
  const http_agent = new HttpAgent(agent_options);
  const https_agent = new HttpAgent.HttpsAgent(agent_options);

  return {
    augment: <C extends NodeNetworkClient>(augmented: Partial<defs.NetworkClientParams<NodeResponse>>) => {
      return createNodeNetworkClient({ ...augmented, ...options }) as C;
    },
    request: (url, params) => {
      const service = process.env.MICRO_SERVICE_NAME;
      const user_agent = `Journey SDK (node-client${service ? `,${service}` : ''})`;

      let headers = {};
      if (params.body && streaming.isStreamedPayload(params.body)) {
        headers = streaming.headersForStream(params.body);
      }

      return requester.request(url, {
        ...(options || {}),
        ...params,
        headers: utils.constructHeaders([headers, params.headers, options?.headers]),
        user_agent: options?.user_agent || user_agent,

        request: async (raw_url, params) => {
          const url = new URL(raw_url);

          let agent: http.Agent | https.Agent;
          let client: typeof http | typeof https;
          switch (url.protocol) {
            default:
            case 'http:': {
              agent = http_agent;
              client = http;
              break;
            }
            case 'https:': {
              agent = https_agent;
              client = https;
              break;
            }
          }

          return new Promise((resolve, reject) => {
            let aborted = false;
            const req = client.request(
              url,
              {
                signal: params.signal,
                method: params.method,
                headers: params.headers,
                agent
              },
              (res) => {
                if (aborted) {
                  return res.destroy(new Error('Aborted'));
                }

                resolve({
                  headers: {
                    get: (key) => utils.getHeader(res.headers as Record<string, string>, key)
                  },
                  status: res.statusCode || 200,
                  body: res,

                  text: async () => {
                    return consumers.text(res);
                  },
                  arrayBuffer: async () => {
                    return consumers.arrayBuffer(res);
                  }
                });
              }
            );

            params.signal.addEventListener('abort', () => {
              req.destroy(new errors.TimeoutError());
              aborted = true;
            });

            req.once('error', reject);

            if (!params.body) {
              return req.end();
            }

            if (Buffer.isBuffer(params.body) || typeof params.body === 'string') {
              req.write(params.body);
              return req.end();
            }

            stream.pipeline(params.body, req, () => {});
          });
        }
      });
    }
  };
};
