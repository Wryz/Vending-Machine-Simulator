/**
 * The city picker's bundled list (CityIndexEntry[], src/data/types.ts), from
 * `pipeline/build-index.ts`, so the globe works before the first download; the
 * app refreshes it from the data API. City data itself is never bundled: the
 * *.json.gz files here are pipeline outputs kept for tests and the R2 upload.
 * Data © OpenStreetMap contributors (ODbL); countries Natural Earth (public domain).
 */
import type { CityIndexEntry } from '../../src/data/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro JSON require
export const REGION_INDEX: CityIndexEntry[] = require('./regions-index.json');
