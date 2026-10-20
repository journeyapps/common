import * as t from 'ts-codec';
import { AnyCodec, Codec } from 'ts-codec';

export interface ExternalTypeCodecProps {
  reference: string;
  declaration?: string;
}

export type ExternalTypeCodec = Codec<unknown, unknown, 'external', ExternalTypeCodecProps>;

export function externalType(props: ExternalTypeCodecProps): ExternalTypeCodec {
  return t.codec<unknown, unknown, 'external', ExternalTypeCodecProps>(
    'external',
    (value) => value,
    (value) => value,
    props
  );
}

export function isExternalTypeCodec(codec: AnyCodec): codec is ExternalTypeCodec {
  return codec._tag === 'external';
}
