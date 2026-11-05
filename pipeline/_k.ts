import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { open } from 'node:fs/promises';
const path = process.argv[2];
const fh = await open(path, 'r');
const pm = new PMTiles({
  getKey: () => path,
  getBytes: async (o: number, l: number) => {
    const b = Buffer.alloc(l);
    await fh.read(b, 0, l, o);
    return { data: b.buffer.slice(b.byteOffset, b.byteOffset + l) };
  },
} as any);
const h = await pm.getHeader();
const lon2x = (lon: number) => Math.floor(((lon + 180) / 360) * 2 ** 15);
const lat2y = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** 15);
};
const kinds: Record<string, number> = {};
let hcount = 0,
  bcount = 0;
const hs: number[] = [];
for (let x = lon2x(h.minLon); x <= lon2x(h.maxLon); x++)
  for (let y = lat2y(h.maxLat); y <= lat2y(h.minLat); y++) {
    const t = await pm.getZxy(15, x, y);
    if (!t) continue;
    const vt = new VectorTile(new PbfReader(new Uint8Array(t.data)));
    const p = vt.layers.pois;
    if (p)
      for (let i = 0; i < p.length; i++) {
        const f = p.feature(i);
        const g = f.loadGeometry()[0][0];
        if (g.x < 0 || g.y < 0 || g.x >= 4096 || g.y >= 4096) continue;
        if (!f.properties.name) continue;
        const k = `${f.properties.kind}`;
        kinds[k] = (kinds[k] ?? 0) + 1;
      }
    const b = vt.layers.buildings;
    if (b)
      for (let i = 0; i < b.length; i++) {
        const f = b.feature(i);
        if (f.properties.kind !== 'building') continue;
        bcount++;
        if (f.properties.height) {
          hcount++;
          hs.push(Number(f.properties.height));
        }
      }
  }
console.log(
  Object.entries(kinds)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}=${v}`)
    .join(' '),
);
hs.sort((a, b) => a - b);
console.log({ bcount, hcount, median: hs[hs.length >> 1] });
