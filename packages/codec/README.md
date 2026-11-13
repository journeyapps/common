# JourneyApps Common Codec

`@journeyapps/common-codec` extends `ts-codec` with function, promise and external-type descriptions, and converts supported codec definitions to and from serializable data.

## Usage

```ts
import * as t from 'ts-codec';
import { fn, promise, serializeCodec, deserializeCodec } from '@journeyapps/common-codec';

const loadUser = fn({
  args: [{ name: 'id', codec: t.string }] as const,
  returns: promise(t.object({ name: t.string }))
});

const definition = serializeCodec(loadUser);
const restored = deserializeCodec(definition);
```

`fn` describes named arguments, an optional rest argument and a return codec. `promise` describes an asynchronous result. These codecs pass values through: they describe signatures, but do not invoke functions or validate their arguments and resolved results.

`externalType({ reference, declaration? })` describes a named external type, with an optional declaration. It also passes values through.

## Definition serialization

`serializeCodec` serializes the codec definition, not an application value or a function body. `deserializeCodec` reconstructs a codec from that definition.

Supported definitions include primitives, dates, literals, enums, objects, records, arrays, tuples, unions, intersections, functions, promises and external types. Optionality and metadata are preserved; metadata must itself be JSON-compatible if you write the result as JSON. Unsupported codec tags throw an error.

Date definitions use the `date` codec from `@journeyapps/micro-codecs`.

## Development

From the workspace root:

```sh
pnpm build
pnpm --filter @journeyapps/common-codec test
```
