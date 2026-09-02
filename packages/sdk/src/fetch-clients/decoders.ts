import * as micro_errors from '@journeyapps/micro-errors';
import * as defs from '../definitions';
import * as codecs from './codecs';
import * as errors from './errors';

const getResponseContentCodec = (contentType: string, configuredCodecs?: defs.Codecs) => {
  // extract the first part of Content-Type - i.e "[application/json]; charset-utf8"
  const normalizedContentType = contentType.replace(/(?!<.*);.*/, '');
  return configuredCodecs?.[normalizedContentType] || codecs.DEFAULT_CODECS[normalizedContentType];
};

export const decodeResponse = async (
  response: defs.TResponse,
  meta: defs.RequestMetadata,
  configuredCodecs?: defs.Codecs
) => {
  const content_type = response.headers.get(defs.Header.ContentType) || defs.ContentType.JSON;

  const contentCodec = getResponseContentCodec(content_type, configuredCodecs);
  if (!contentCodec) {
    const raw = await response.text();
    throw new errors.UnparsableServiceResponse(`${meta.method} ${meta.url}`, response.status, raw);
  }

  return contentCodec.decode(await response.arrayBuffer());
};

export const decodeServiceResponse = async (
  response: defs.TResponse,
  meta: defs.RequestMetadata,
  configuredCodecs?: defs.Codecs
) => {
  const decoded = await decodeResponse(response, meta, configuredCodecs);

  if (decoded !== null && typeof decoded === 'object') {
    if ('data' in decoded) {
      return decoded.data;
    }

    if ('error' in decoded && decoded.error) {
      throw new micro_errors.JourneyError(decoded.error);
    }
  }

  /**
   * Not a JSON response, meaning it's not a standard response or error produced by journey-micro.
   * This typically means something like a 404 or a 503 (gateway error).
   * The body is usually meaningless in these cases.
   * 3xx responses are also unexpected here.
   */
  if (response.status >= 300) {
    throw new errors.UnparsableServiceResponse(`${meta.method} ${meta.url}`, response.status);
  }

  return null;
};

/** Build a response decoder that uses the client's configured content codecs. */
export const buildServiceResponseDecoder = (configuredCodecs?: defs.Codecs) => {
  return (response: defs.TResponse, meta: defs.RequestMetadata) =>
    decodeServiceResponse(response, meta, configuredCodecs);
};
