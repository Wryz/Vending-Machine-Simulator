/**
 * Print the Protomaps v4 `kind` / `kind_detail` values found in the z15 tiles
 * of a local PMTiles extract — used to build the category mapping in
 * build-city.ts.   Usage: npx tsx inspect-kinds.ts out/extracts/<city>.pmtiles
 */
import { features, latToTileY, lngToTileX, openArchive, readTile } from './lib/mvt';

const path = process.argv[2];
if (!path) {
  console.error('usage: tsx inspect-kinds.ts <archive.pmtiles>');
  process.exit(1);
}
const { pm, close } = await openArchive(path);
const h = await pm.getHeader();
const Z = 15;
const counts: Record<string, Record<string, number>> = {};
for (let x = lngToTileX(h.minLon, Z); x <= lngToTileX(h.maxLon, Z); x++)
  for (let y = latToTileY(h.maxLat, Z); y <= latToTileY(h.minLat, Z); y++) {
    const t = await readTile(pm, Z, x, y);
    if (!t) continue;
    for (const layer of ['pois', 'landuse', 'buildings']) {
      for (const f of features(t, layer)) {
        if (layer === 'pois') {
          const g = f.loadGeometry()[0]?.[0];
          if (!g || g.x < 0 || g.y < 0 || g.x >= f.extent || g.y >= f.extent) continue;
        }
        const k = `${String(f.properties.kind)}${f.properties.kind_detail ? '/' + String(f.properties.kind_detail) : ''}${layer === 'pois' && f.properties.name ? '' : layer === 'pois' ? ' (unnamed)' : ''}`;
        (counts[layer] ??= {})[k] = (counts[layer][k] ?? 0) + 1;
      }
    }
  }
await close();
for (const [layer, c] of Object.entries(counts)) {
  console.log(`\n== ${layer}`);
  console.log(
    Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join('  '),
  );
}
