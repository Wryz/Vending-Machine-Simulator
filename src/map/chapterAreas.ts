import { cellsToMultiPolygon } from 'h3-js';

import { DISTRICTS } from '@/config/progression';
import { districtChapter, type World } from '@/sim';
import { offsetPoint } from '@/sim/geo';

type Fc = GeoJSON.FeatureCollection;
const EMPTY: Fc = { type: 'FeatureCollection', features: [] };

export interface ChapterAreas {
  /** Locked neighbourhoods (dimmed), or the locked land outside the open ring. */
  locked: Fc;
  /** The edge of where machines can go right now. */
  openEdge: Fc;
  /** Name + "Chapter N" tags at each locked neighbourhood, or one tag on the ring. */
  tags: Fc;
}

/**
 * What the chapter rings mean, drawn on the map (SPEC §4.4): the open area's
 * edge, and every locked neighbourhood with the chapter that opens it. Cities
 * without named neighbourhoods show the plain ring with one "Chapter N" tag.
 */
export function chapterAreas(
  world: World,
  chapter: number,
  label: (chapter: number, name: string | null) => string,
): ChapterAreas {
  if (world.hoods) {
    const byHood = new Map<number, string[]>();
    for (const [cell, i] of world.hoods.cellHood) {
      const list = byHood.get(i);
      if (list) list.push(cell);
      else byHood.set(i, [cell]);
    }
    const locked: GeoJSON.Feature[] = [];
    const tags: GeoJSON.Feature[] = [];
    const open: string[] = [];
    for (const [i, cells] of byHood) {
      const h = world.hoods.hoods[i];
      const opensIn = districtChapter(h.district);
      if (opensIn <= chapter) {
        open.push(...cells);
        continue;
      }
      locked.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'MultiPolygon', coordinates: cellsToMultiPolygon(cells, true) },
      });
      tags.push({
        type: 'Feature',
        properties: { label: label(opensIn, h.name) },
        geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
      });
    }
    // Everything is open: nothing to explain.
    if (!locked.length) return { locked: EMPTY, openEdge: EMPTY, tags: EMPTY };
    return {
      locked: { type: 'FeatureCollection', features: locked },
      openEdge: {
        type: 'FeatureCollection',
        features: open.length
          ? [
              {
                type: 'Feature',
                properties: {},
                geometry: { type: 'MultiPolygon', coordinates: cellsToMultiPolygon(open, true) },
              },
            ]
          : [],
      },
      tags: { type: 'FeatureCollection', features: tags },
    };
  }

  // No neighbourhood names: the ring around the start point.
  const unlocked = DISTRICTS.filter((d) => d.unlockChapter <= chapter);
  const d = unlocked[unlocked.length - 1];
  const next = DISTRICTS.find((x) => x.unlockChapter > chapter);
  if (!d || !next || d.radiusKm >= 30) return { locked: EMPTY, openEdge: EMPTY, tags: EMPTY };
  const ring: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const p = offsetPoint(world.city, (i / 64) * 360, d.radiusKm * 1000);
    ring.push([p.lng, p.lat]);
  }
  const tagAt = offsetPoint(world.city, 0, d.radiusKm * 1000 + 150);
  return {
    locked: EMPTY,
    openEdge: {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ring } },
      ],
    },
    tags: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { label: label(next.unlockChapter, null) },
          geometry: { type: 'Point', coordinates: [tagAt.lng, tagAt.lat] },
        },
      ],
    },
  };
}
