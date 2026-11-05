import { installTextDecoderShim } from './textDecoderShim';

describe('h3 on a UTF-8-only TextDecoder (Hermes-like)', () => {
  it('h3-js loads and works once the shim is installed', () => {
    const real = globalThis.TextDecoder;
    class Utf8Only {
      constructor(label = 'utf-8') {
        if (!/^utf-?8$/i.test(label)) throw new RangeError(`Unknown encoding: ${label}`);
      }
      decode(b?: Uint8Array) {
        return new real().decode(b);
      }
    }
    const g = globalThis as unknown as { TextDecoder: unknown };
    g.TextDecoder = Utf8Only;
    jest.isolateModules(() => {
      // Without the shim h3-js throws at import time.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      expect(() => require('h3-js')).toThrow(/Unknown encoding/);
    });
    installTextDecoderShim();
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const h3 = require('h3-js') as typeof import('h3-js');
      const cell = h3.latLngToCell(40.7128, -74.006, 9);
      expect(h3.getResolution(cell)).toBe(9);
      expect(h3.gridDisk(cell, 1)).toHaveLength(7);
    });
    g.TextDecoder = real;
  });
});
