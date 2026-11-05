// Minimal PNG encoder (8-bit RGBA or RGB, adaptive filtering, zlib level 9).
// Used by the sprite, brand and preview scripts so output is deterministic and
// RGB (no alpha) where the App Store requires it.
import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/**
 * @param {{width:number,height:number,data:Uint8Array|Buffer}} img RGBA pixels
 * @param {{alpha?: boolean}} [opts] alpha=false writes an RGB PNG (alpha dropped)
 */
export function encodePNG(img, opts = {}) {
  const { width, height } = img;
  const alpha = opts.alpha !== false;
  const bpp = alpha ? 4 : 3;
  const stride = width * bpp;
  // Repack (and zero colour under fully transparent pixels: compresses better).
  const px = Buffer.alloc(stride * height);
  for (let i = 0, j = 0; i < width * height; i++) {
    const a = img.data[i * 4 + 3];
    if (alpha && a === 0) {
      j += 4;
      continue;
    }
    px[j++] = img.data[i * 4];
    px[j++] = img.data[i * 4 + 1];
    px[j++] = img.data[i * 4 + 2];
    if (alpha) px[j++] = a;
  }
  const out = Buffer.alloc((stride + 1) * height);
  const cand = [0, 1, 2, 3, 4].map(() => Buffer.alloc(stride));
  for (let y = 0; y < height; y++) {
    const row = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    let best = 0;
    let bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      const c = cand[f];
      let score = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? row[x - bpp] : 0;
        const b = prev ? prev[x] : 0;
        const cc = prev && x >= bpp ? prev[x - bpp] : 0;
        let v = row[x];
        if (f === 1) v -= a;
        else if (f === 2) v -= b;
        else if (f === 3) v -= (a + b) >> 1;
        else if (f === 4) v -= paeth(a, b, cc);
        v &= 0xff;
        c[x] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        best = f;
      }
    }
    out[y * (stride + 1)] = best;
    cand[best].copy(out, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = alpha ? 6 : 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(out, { level: 9, memLevel: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
