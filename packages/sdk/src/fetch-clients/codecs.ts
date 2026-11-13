import * as defs from '../definitions.js';
import * as bson from 'bson';

export const JSONCodec: defs.Codec = {
  encode: (data) => JSON.stringify(data),
  decode: (data) => {
    let raw;
    if (data instanceof ArrayBuffer) {
      const decoder = new TextDecoder('utf-8');
      raw = decoder.decode(data);
    } else {
      raw = data.toString();
    }
    return JSON.parse(raw);
  }
};

export const BSONCodec: defs.Codec = {
  encode: (data) => {
    return bson.serialize(data as any, {
      ignoreUndefined: true
    });
  },
  decode: (data) => {
    return bson.deserialize(data as Uint8Array, {
      promoteBuffers: true
    });
  }
};

export const DEFAULT_CODECS: defs.Codecs = {
  [defs.ContentType.JSON]: JSONCodec,
  [defs.ContentType.BSON]: BSONCodec
};
