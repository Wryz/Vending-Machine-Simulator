/**
 * Equirectangular Earth texture for the city picker's GPU globe
 * (src/ui/picker/PickerGlobe.tsx).
 *
 *   npx tsx gen-globe-texture.ts [width]     -> ../assets/globe/earth.jpg
 *
 * Bright, flat game palette (the same colors as GLOBE.colors) with a light
 * Natural Earth shaded relief on land, a soft shallow-water band along the
 * coasts, snow on the ice caps and faint country borders. Sources, both
 * Natural Earth (public domain):
 *   - out/naturalearth/ne_50m_admin_0_countries.geojson (already downloaded
 *     for gen-geo-regions.ts)
 *   - SR_50M (1:50m shaded relief raster), downloaded here on first run.
 * Needs `curl`, `unzip` and ImageMagick (`magick`) on the PATH. Width
 * defaults to 4096 (height is half); the JPEG aims for < 1.5 MB.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NE = path.join(HERE, 'out', 'naturalearth');
const OUT = path.join(HERE, '..', 'assets', 'globe', 'earth.jpg');
const SR_URL = 'https://naciscdn.org/naturalearth/50m/raster/SR_50M.zip';

const W = Number(process.argv[2] ?? 4096);
const H = W / 2;
/** Countries are rasterized at this multiple, then averaged (smooth coasts, thin borders). */
const SS = 2;

// Colors (keep in step with GLOBE.colors in src/config/map.ts).
const OCEAN_DEEP = hex('#4AA6E0');
const OCEAN = hex('#5BB8EE');
const OCEAN_SHALLOW = hex('#86D0F5');
const LAND = hex('#9ED67F');
const SNOW = hex('#F4F7FF');
const BORDER = hex('#5E9A4E');
const BORDER_ALPHA = 0.45;
/** How strongly the relief lightens/darkens land (0 = flat). */
const RELIEF = 0.55;
/** Land fades to snow between these |latitudes|. */
const SNOW_FROM = 66;
const SNOW_TO = 76;
/** Coastal glow: box-blur radius (output px at 4096 wide) and strength. */
const SHALLOW_R = 7;
const SHALLOW_K = 2.2;
const QUALITY = 84;

type RGB = [number, number, number];
function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Grayscale shaded relief resampled to W×H (0..255). */
function relief(): Uint8Array {
  mkdirSync(NE, { recursive: true });
  const dir = path.join(NE, 'SR_50M');
  const tif = path.join(dir, 'SR_50M.tif');
  if (!existsSync(tif)) {
    const zip = path.join(NE, 'SR_50M.zip');
    if (!existsSync(zip)) execFileSync('curl', ['-fL', '-o', zip, SR_URL], { stdio: 'inherit' });
    execFileSync('unzip', ['-o', zip, '-d', dir], { stdio: 'inherit' });
  }
  const raw = path.join(NE, `SR_50M_${W}.gray`);
  execFileSync('magick', [tif, '-resize', `${W}x${H}!`, '-depth', '8', `gray:${raw}`]);
  return new Uint8Array(readFileSync(raw));
}

type Ring = [number, number][];
interface Country {
  name: string;
  polygons: Ring[][];
}

function countries(): Country[] {
  const fc = JSON.parse(
    readFileSync(path.join(NE, 'ne_50m_admin_0_countries.geojson'), 'utf8'),
  ) as {
    features: {
      properties: { ADMIN: string };
      geometry: { type: string; coordinates: unknown };
    }[];
  };
  return fc.features.map((f) => ({
    name: f.properties.ADMIN,
    polygons:
      f.geometry.type === 'Polygon'
        ? [f.geometry.coordinates as Ring[]]
        : (f.geometry.coordinates as Ring[][]),
  }));
}

/** Even-odd scanline fill of each polygon (with its holes) into `ids` at SS× resolution. */
function rasterize(list: Country[]): Uint16Array {
  const w = W * SS;
  const h = H * SS;
  const ids = new Uint16Array(w * h);
  list.forEach((c, ci) => {
    for (const poly of c.polygons) {
      const edges: [number, number, number, number][] = [];
      let minY = Infinity;
      let maxY = -Infinity;
      for (const ring of poly) {
        for (let i = 0; i < ring.length - 1; i++) {
          const x0 = ((ring[i][0] + 180) / 360) * w;
          const y0 = ((90 - ring[i][1]) / 180) * h;
          const x1 = ((ring[i + 1][0] + 180) / 360) * w;
          const y1 = ((90 - ring[i + 1][1]) / 180) * h;
          if (y0 === y1) continue;
          edges.push([x0, y0, x1, y1]);
          minY = Math.min(minY, y0, y1);
          maxY = Math.max(maxY, y0, y1);
        }
      }
      const ys = Math.max(0, Math.floor(minY));
      const ye = Math.min(h - 1, Math.ceil(maxY));
      const xs: number[] = [];
      for (let y = ys; y <= ye; y++) {
        const sy = y + 0.5;
        xs.length = 0;
        for (const [x0, y0, x1, y1] of edges) {
          if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) {
            xs.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
          }
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const a = Math.max(0, Math.ceil(xs[k] - 0.5));
          const b = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5));
          for (let x = a; x <= b; x++) ids[y * w + x] = ci + 1;
        }
      }
    }
  });
  return ids;
}

/** Separable box blur (wraps in x, clamps in y). */
function boxBlur(src: Float32Array, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const n = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += src[y * W + ((k + W) % W)];
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = s / n;
      s += src[y * W + ((x + r + 1) % W)] - src[y * W + ((x - r + W) % W)];
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += tmp[Math.max(0, Math.min(H - 1, y + k)) * W + x];
      out[y * W + x] = s / n;
    }
  }
  return out;
}

function main() {
  const list = countries();
  const icy = new Set(
    list.flatMap((c, i) => (c.name === 'Antarctica' || c.name === 'Greenland' ? [i + 1] : [])),
  );
  console.log(`rasterizing ${list.length} countries at ${W * SS}x${H * SS}…`);
  const ids = rasterize(list);
  const sr = relief();
  const w2 = W * SS;

  // Land share, ice share and border share per output pixel.
  const land = new Float32Array(W * H);
  const ice = new Float32Array(W * H);
  const border = new Float32Array(W * H);
  const inv = 1 / (SS * SS);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let l = 0;
      let i = 0;
      let b = 0;
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const sx = x * SS + dx;
          const sy = y * SS + dy;
          const id = ids[sy * w2 + sx];
          if (!id) continue;
          l++;
          if (icy.has(id)) i++;
          const r = ids[sy * w2 + ((sx + 1) % w2)];
          const d = sy + 1 < H * SS ? ids[(sy + 1) * w2 + sx] : 0;
          if ((r && r !== id) || (d && d !== id)) b++;
        }
      }
      land[y * W + x] = l * inv;
      ice[y * W + x] = i * inv;
      border[y * W + x] = Math.min(1, b * inv * 2);
    }
  }
  const shallow = boxBlur(boxBlur(land, Math.round((SHALLOW_R * W) / 4096)), 2);

  // Typical relief value on flat ground: the median over land.
  const hist = new Uint32Array(256);
  for (let p = 0; p < W * H; p++) if (land[p] > 0.5) hist[sr[p]]++;
  let total = 0;
  for (const c of hist) total += c;
  let acc = 0;
  let flat = 0;
  for (; flat < 256; flat++) {
    acc += hist[flat];
    if (acc >= total / 2) break;
  }
  console.log(`relief median on land: ${flat}`);

  const rgb = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    const lat = 90 - ((y + 0.5) / H) * 180;
    const polar = clamp01((Math.abs(lat) - SNOW_FROM) / (SNOW_TO - SNOW_FROM));
    // Deeper blue toward the poles and mid-ocean, lighter along coasts.
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      let water = mix(OCEAN_DEEP, OCEAN, 0.6);
      water = mix(water, OCEAN_SHALLOW, clamp01(shallow[p] * SHALLOW_K));
      let ground = mix(LAND, SNOW, Math.max(ice[p] / Math.max(land[p], 1e-6), polar));
      const shade = ((sr[p] - flat) / 128) * RELIEF;
      ground = ground.map((v) => v * (1 + shade)) as RGB;
      ground = mix(ground, BORDER, border[p] * BORDER_ALPHA);
      const c = mix(water, ground, land[p]);
      rgb[p * 3] = Math.round(Math.max(0, Math.min(255, c[0])));
      rgb[p * 3 + 1] = Math.round(Math.max(0, Math.min(255, c[1])));
      rgb[p * 3 + 2] = Math.round(Math.max(0, Math.min(255, c[2])));
    }
  }

  const ppm = path.join(NE, `globe_${W}.ppm`);
  writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), rgb]));
  mkdirSync(path.dirname(OUT), { recursive: true });
  execFileSync('magick', [
    ppm,
    '-strip',
    '-interlace',
    'none',
    '-sampling-factor',
    '4:2:0',
    '-quality',
    String(QUALITY),
    OUT,
  ]);
  console.log(`wrote ${OUT}`);
}

main();
