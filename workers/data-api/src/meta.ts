/**
 * Region summary written by the pipeline next to each region pack
 * (`cells/{res5}.meta.json`, and `pipeline/out/{cityId}.meta.json` for cities).
 * The Worker reads it to apply the SPEC §6.2 thresholds without downloading
 * the full pack.
 */
export interface RegionMeta {
  schemaVersion: 1;
  res5?: string;
  cityId?: string;
  name?: string;
  /** Where the game opens (downtown / busiest spot); older metas: none. */
  center?: { lat: number; lng: number };
  cc?: string;
  tz?: string;
  dir?: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
  generatedAt: string;
  totals: {
    cells: number;
    namedPlaces: number;
    /** Distinct place categories present. */
    categories: number;
    pop: number;
  };
  /**
   * Per res-9 cell: [h3 index, named places in cell, category bitmask, residents].
   * Bit i of the mask is set when PLACE_CATEGORIES[i] has ≥1 place in the cell.
   */
  cells: [string, number, number, number][];
}

export function isRegionMeta(v: unknown): v is RegionMeta {
  if (typeof v !== 'object' || v === null) return false;
  const m = v as Partial<RegionMeta>;
  return m.schemaVersion === 1 && Array.isArray(m.cells);
}
