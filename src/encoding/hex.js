import { encode as encodeHex } from '../deps/std/encoding/hex.ts';

import { stringify as stringifyUint8Array } from './uint8array.js';

export const stringify = uint8array => stringifyUint8Array(encodeHex(uint8array));
