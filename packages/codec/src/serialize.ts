import * as t from 'ts-codec';
import { AnyCodec } from 'ts-codec';
import { date } from '@journeyapps/micro-codecs';
import { fn, promise, FunctionCodecArgument } from './function-codec';
import { externalType } from './external-codec';

export type SerializedCodec =
  | {
      type: 'string' | 'number' | 'boolean' | 'any' | 'null' | 'date';
      required?: boolean;
      metadata?: Record<string, any>;
    }
  | {
      type: 'literal';
      value: string | number | boolean | null;
      required?: boolean;
      metadata?: Record<string, any>;
    }
  | {
      type: 'enum';
      values: Record<string, string>;
      required?: boolean;
      metadata?: Record<string, any>;
    }
  | {
      type: 'object';
      shape: Record<string, SerializedCodec>;
      required?: boolean;
      metadata?: Record<string, any>;
    }
  | {
      type: 'record' | 'array';
      value: SerializedCodec;
      required?: boolean;
      metadata?: Record<string, any>;
    }
  | {
      type: 'tuple' | 'union' | 'intersection';
      codecs: SerializedCodec[];
      required?: boolean;
      metadata?: Record<string, any>;
    }
  | {
      type: 'function';
      args: Array<{ name: string; codec: SerializedCodec }>;
      rest?: { name: string; codec: SerializedCodec };
      returns: SerializedCodec;
      required?: boolean;
      metadata?: Record<string, any>;
    }
  | {
      type: 'promise';
      value: SerializedCodec;
      required?: boolean;
      metadata?: Record<string, any>;
    }
  | {
      type: 'external';
      reference: string;
      declaration?: string;
      required?: boolean;
      metadata?: Record<string, any>;
    };

export function serializeCodec(codec: AnyCodec): SerializedCodec {
  const serialized = serializeRequiredCodec(codec);
  if (codec.props.required === false) {
    serialized.required = false;
  }
  if (codec.props.metadata && Object.keys(codec.props.metadata).length > 0) {
    serialized.metadata = codec.props.metadata;
  }
  return serialized;
}

export function deserializeCodec(serialized: SerializedCodec): AnyCodec {
  let codec = deserializeRequiredCodec(serialized);
  if (serialized.metadata) {
    codec = codec.meta(serialized.metadata);
  }
  if (serialized.required === false) {
    codec = codec.optional();
  }
  return codec;
}

function serializeRequiredCodec(codec: AnyCodec): SerializedCodec {
  switch (codec._tag) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'any':
    case 'null':
      return { type: codec._tag };
    case 'Date':
      return { type: 'date' };
    case 'literal':
      return { type: 'literal', value: codec.props.value };
    case 'enum':
      return { type: 'enum', values: codec.props.enum };
    case 'object':
      return {
        type: 'object',
        shape: Object.fromEntries(
          Object.entries(codec.props.shape).map(([key, childCodec]) => [key, serializeCodec(childCodec as AnyCodec)])
        )
      };
    case 'record':
      return { type: 'record', value: serializeCodec(codec.props.type) };
    case 'array':
      return { type: 'array', value: serializeCodec(codec.props.type) };
    case 'tuple':
      return { type: 'tuple', codecs: codec.props.codecs.map(serializeCodec) };
    case 'union':
      return { type: 'union', codecs: codec.props.codecs.map(serializeCodec) };
    case 'intersection':
      return { type: 'intersection', codecs: codec.props.codecs.map(serializeCodec) };
    case 'function':
      const serializedFunction: SerializedCodec = {
        type: 'function',
        args: codec.props.args.map((arg: FunctionCodecArgument) => ({
          name: arg.name,
          codec: serializeCodec(arg.codec)
        })),
        returns: serializeCodec(codec.props.returns)
      };
      if (codec.props.rest) {
        serializedFunction.rest = {
          name: codec.props.rest.name,
          codec: serializeCodec(codec.props.rest.codec)
        };
      }
      return serializedFunction;
    case 'promise':
      return { type: 'promise', value: serializeCodec(codec.props.value) };
    case 'external':
      return {
        type: 'external',
        reference: codec.props.reference,
        declaration: codec.props.declaration
      };
    default:
      throw new Error(`Cannot serialize unsupported codec '${codec._tag}'.`);
  }
}

function deserializeRequiredCodec(serialized: SerializedCodec): AnyCodec {
  switch (serialized.type) {
    case 'string':
      return t.string;
    case 'number':
      return t.number;
    case 'boolean':
      return t.boolean;
    case 'any':
      return t.any;
    case 'null':
      return t.Null;
    case 'date':
      return date;
    case 'literal':
      if (serialized.value === null) {
        return t.Null;
      }
      return t.literal(serialized.value);
    case 'enum':
      return t.Enum(serialized.values);
    case 'object':
      return t.object(
        Object.fromEntries(
          Object.entries(serialized.shape).map(([key, childCodec]) => [key, deserializeCodec(childCodec)])
        )
      );
    case 'record':
      return t.record(deserializeCodec(serialized.value));
    case 'array':
      return t.array(deserializeCodec(serialized.value));
    case 'tuple':
      return t.tuple(serialized.codecs.map(deserializeCodec) as [AnyCodec, ...AnyCodec[]]);
    case 'union':
      return serialized.codecs.map(deserializeCodec).reduce((left, right) => left.or(right));
    case 'intersection':
      return serialized.codecs.map(deserializeCodec).reduce((left, right) => left.and(right));
    case 'function':
      return fn({
        args: serialized.args.map((arg) => ({
          name: arg.name,
          codec: deserializeCodec(arg.codec)
        })),
        rest: serialized.rest
          ? {
              name: serialized.rest.name,
              codec: deserializeCodec(serialized.rest.codec)
            }
          : undefined,
        returns: deserializeCodec(serialized.returns)
      });
    case 'promise':
      return promise(deserializeCodec(serialized.value));
    case 'external':
      return externalType({
        reference: serialized.reference,
        declaration: serialized.declaration
      });
  }
}
