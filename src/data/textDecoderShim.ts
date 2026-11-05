/**
 * h3-js (Emscripten output) calls `new TextDecoder('utf-16le')` at module load
 * (uber/h3-js#203). Hermes' TextDecoder may be UTF-8 only and throw
 * "Unknown encoding". This shim wraps the global so unsupported encodings fall
 * back to a small pure-JS decoder. It must be imported before h3-js.
 */
type DecoderCtor = new (
  label?: string,
  options?: unknown,
) => { decode(input?: ArrayBufferView | ArrayBuffer): string };

class Utf16LeDecoder {
  readonly encoding = 'utf-16le';
  decode(input?: ArrayBufferView | ArrayBuffer): string {
    if (!input) return '';
    const bytes =
      input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    let out = '';
    for (let i = 0; i + 1 < bytes.length; i += 2)
      out += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
    return out;
  }
}

export function installTextDecoderShim(
  target: { TextDecoder?: DecoderCtor } = globalThis as never,
): void {
  const Native = target.TextDecoder;
  if (Native) {
    try {
      new Native('utf-16le');
      return; // native support, nothing to do
    } catch {
      // fall through and wrap
    }
  }
  const Wrapped = function (this: unknown, label = 'utf-8', options?: unknown) {
    const l = String(label).toLowerCase();
    if (l === 'utf-16le' || l === 'utf-16') return new Utf16LeDecoder();
    if (!Native) throw new RangeError(`Unsupported encoding: ${label}`);
    return new Native(label, options);
  } as unknown as DecoderCtor;
  target.TextDecoder = Wrapped;
}

installTextDecoderShim();
