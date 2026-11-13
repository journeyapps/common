import * as t from 'ts-codec';
import { AnyCodec, Codec, Decoded } from 'ts-codec';

export interface FunctionCodecArgument<C extends AnyCodec = AnyCodec> {
  name: string;
  codec: C;
}

type FunctionArguments<T extends readonly FunctionCodecArgument[]> = {
  [K in keyof T]: T[K] extends FunctionCodecArgument<infer C> ? Decoded<C> : never;
};

type FunctionRestArguments<Rest extends FunctionCodecArgument | undefined> =
  Rest extends FunctionCodecArgument<infer C> ? Decoded<C>[] : [];

export interface FunctionCodecProps<
  Args extends readonly FunctionCodecArgument[] = readonly FunctionCodecArgument[],
  Rest extends FunctionCodecArgument | undefined = FunctionCodecArgument | undefined
> {
  args?: Args;
  rest?: Rest;
  returns: AnyCodec;
}

export type FunctionCodec<T extends (...args: any[]) => any = (...args: any[]) => any> = Codec<
  T,
  T,
  'function',
  FunctionCodecProps
>;

export function fn<
  Args extends readonly FunctionCodecArgument[],
  ReturnCodec extends AnyCodec,
  Rest extends FunctionCodecArgument | undefined = undefined
>(
  props: FunctionCodecProps<Args, Rest> & { returns: ReturnCodec }
): FunctionCodec<(...args: [...FunctionArguments<Args>, ...FunctionRestArguments<Rest>]) => Decoded<ReturnCodec>> {
  return t.codec<
    (...args: [...FunctionArguments<Args>, ...FunctionRestArguments<Rest>]) => Decoded<ReturnCodec>,
    (...args: [...FunctionArguments<Args>, ...FunctionRestArguments<Rest>]) => Decoded<ReturnCodec>,
    'function',
    FunctionCodecProps<Args, Rest> & { returns: ReturnCodec }
  >(
    'function',
    (value) => value,
    (value) => value,
    {
      args: [] as unknown as Args,
      ...props
    }
  );
}

export interface PromiseCodecProps {
  value: AnyCodec;
}

export type PromiseCodec<T> = Codec<Promise<T>, Promise<T>, 'promise', PromiseCodecProps>;

export function promise<C extends AnyCodec>(value: C): PromiseCodec<Decoded<C>> {
  return t.codec<Promise<Decoded<C>>, Promise<Decoded<C>>, 'promise', PromiseCodecProps>(
    'promise',
    (result) => result,
    (result) => result,
    { value }
  );
}
