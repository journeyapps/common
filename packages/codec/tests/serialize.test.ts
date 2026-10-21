import { describe, expect, it } from 'vitest';
import * as t from 'ts-codec';
import { deserializeCodec, fn, promise, serializeCodec } from '../src';

describe('codec serialization', () => {
  it('round-trips object codecs with optional properties', () => {
    const codec = t.object({
      name: t.string,
      age: t.number.optional(),
      flags: t.array(t.boolean)
    });

    const serialized = serializeCodec(codec);
    const restored = deserializeCodec(serialized);

    expect(serialized).toEqual({
      type: 'object',
      shape: {
        name: { type: 'string' },
        age: { type: 'number', required: false },
        flags: { type: 'array', value: { type: 'boolean' } }
      }
    });
    expect(restored.decode({ name: 'Dylan', flags: [true] })).toEqual({ name: 'Dylan', flags: [true] });
  });

  it('round-trips function codecs with named args and promise returns', () => {
    const resultCodec = t.object({
      token: t.string
    });
    const codec = fn({
      args: [
        { name: 'reportId', codec: t.string },
        { name: 'includeUrls', codec: t.boolean }
      ] as const,
      returns: promise(resultCodec)
    });

    const serialized = serializeCodec(codec);
    const restored = deserializeCodec(serialized);

    expect(serialized).toEqual({
      type: 'function',
      args: [
        { name: 'reportId', codec: { type: 'string' } },
        { name: 'includeUrls', codec: { type: 'boolean' } }
      ],
      returns: {
        type: 'promise',
        value: {
          type: 'object',
          shape: {
            token: { type: 'string' }
          }
        }
      }
    });
    expect(restored._tag).toBe('function');
    expect(restored.props.args[0].name).toBe('reportId');
    expect(restored.props.returns._tag).toBe('promise');
  });

  it('round-trips function codecs with rest args', () => {
    const codec = fn({
      args: [{ name: 'path', codec: t.string }] as const,
      rest: { name: 'args', codec: t.any },
      returns: t.any
    });

    const serialized = serializeCodec(codec);
    const restored = deserializeCodec(serialized);

    expect(serialized).toEqual({
      type: 'function',
      args: [{ name: 'path', codec: { type: 'string' } }],
      rest: { name: 'args', codec: { type: 'any' } },
      returns: { type: 'any' }
    });
    expect(restored._tag).toBe('function');
    expect(restored.props.rest.name).toBe('args');
    expect(restored.props.rest.codec._tag).toBe('any');
  });

  it('round-trips unions and metadata', () => {
    const codec = t.literal('report').or(t.literal('dashboard')).meta({ label: 'PowerBI type' }).optional();

    const serialized = serializeCodec(codec);
    const restored = deserializeCodec(serialized);

    expect(serialized).toEqual({
      type: 'union',
      codecs: [
        { type: 'literal', value: 'report' },
        { type: 'literal', value: 'dashboard' }
      ],
      required: false,
      metadata: { label: 'PowerBI type' }
    });
    expect(restored.decode('report')).toBe('report');
    expect(restored.decode(undefined)).toBeUndefined();
  });
});
