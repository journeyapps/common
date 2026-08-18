import * as micro_streaming from '@journeyapps/micro-streaming';
import type * as stream from 'stream/web';
import * as defs from './definitions';

/**
 * This is for web compatibility. Web based ReadableStreams are not iterable even though we type them as such
 */
export const ensureIterable = (iterable: micro_streaming.StreamLike<any> | stream.ReadableStream) => {
  if (iterable instanceof micro_streaming.compat.Readable && !(Symbol.asyncIterator in iterable)) {
    return micro_streaming.iterableFromReadable(iterable);
  }
  return iterable;
};

export enum StreamType {
  Raw = 'raw',
  Header = 'header',
  Bson = 'bson'
}

export type StreamPayload<H, S, T extends StreamType> = {
  type: T;

  stream: micro_streaming.StreamLike<S>;
  header: H;

  encode: () => micro_streaming.StreamLike<Buffer>;
  setHeader: <M extends {}>(header: M) => StreamPayload<M, S, T>;
};

export type TRawStream = StreamPayload<any, Buffer, StreamType.Raw>;
export type THeaderStream<H> = StreamPayload<H, Buffer, StreamType.Header>;
export type TBsonStream<H, S> = StreamPayload<H, S, StreamType.Bson>;

export class RawStream implements TRawStream {
  type = StreamType.Raw as StreamType.Raw;
  stream: micro_streaming.StreamLike<Buffer>;
  header: any = undefined;

  constructor(stream: micro_streaming.StreamLike<Buffer>) {
    this.stream = stream;
  }

  encode = () => {
    return this.stream;
  };

  setHeader = () => {
    return new RawStream(this.stream);
  };
}

export class HeaderStream<H extends {}> implements THeaderStream<H> {
  type = StreamType.Header as StreamType.Header;
  header: H;
  stream: micro_streaming.StreamLike<Buffer>;

  constructor(stream: micro_streaming.StreamLike<Buffer>, header: H) {
    this.stream = stream;
    this.header = header;
  }

  encode = () => {
    return micro_streaming.bson.prependHeaderToStream(this.header, ensureIterable(this.stream));
  };

  setHeader = <H extends {}>(header: H) => {
    return new HeaderStream(this.stream, header);
  };
}

export class BsonStream<H extends {}, S> implements TBsonStream<H, S> {
  type = StreamType.Bson as StreamType.Bson;
  header: H;
  stream: micro_streaming.StreamLike<S>;

  constructor(stream: micro_streaming.StreamLike<S>, header: H) {
    this.stream = stream;
    this.header = header;
  }

  encode() {
    const encoded = micro_streaming
      .readableFrom(this.stream)
      .pipeThrough(micro_streaming.bson.createBSONStreamEncoder());

    return micro_streaming.bson.prependHeaderToStream(this.header, ensureIterable(encoded));
  }

  setHeader = <H extends {}>(header: H) => {
    return new BsonStream(this.stream, header);
  };
}

/**
 * Utility type which to specify the most specific type of stream but offer a range of
 * less specific fallback stream types.
 *
 * This would most likely be used in SDK client definitions to allow callers to passthrough
 * already encoded streams
 */
export type Stream<H, I> = TBsonStream<H, I> | THeaderStream<H> | TRawStream;

export const isStreamedPayload = (payload: any): payload is StreamPayload<any, any, any> => {
  return Object.values(StreamType).includes(payload?.type);
};

export const isRawStream = (payload: any): payload is TRawStream => {
  return payload?.type === 'raw';
};

export const isHeaderStream = (payload: any): payload is THeaderStream<any> => {
  return payload?.type === 'header';
};

export const isBsonStream = (payload: any): payload is TBsonStream<any, any> => {
  return payload?.type === 'bson';
};

export const headersForStream = (stream: StreamPayload<any, any, any>) => {
  switch (stream.type) {
    case StreamType.Header: {
      return {
        [defs.Header.ContentType]: defs.ContentType.HeaderStream
      };
    }
    case StreamType.Bson: {
      return {
        [defs.Header.ContentType]: defs.ContentType.BSONStream
      };
    }
    default: {
      return {};
    }
  }
};
