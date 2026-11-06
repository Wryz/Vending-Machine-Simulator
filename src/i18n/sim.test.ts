import fs from 'node:fs';
import path from 'node:path';

import { CURRENCIES } from '@/config/currency';
import { useCurrency } from '@/store/currency';

import { CATALOGS } from './catalogs';
import { isPlural } from './core';
import {
  alertText,
  ledgerCategory,
  logText,
  matchSimText,
  simError,
  spotReason,
  venueName,
} from './sim';

/**
 * The sim speaks English; src/i18n/sim.ts maps its text to catalog keys
 * derived from the English catalog. These tests scan src/sim so the catalog
 * can't drift from the sim: every literal message must be a known key, every
 * interpolated one must have a template, and English renders unchanged.
 */
const SIM = path.join(__dirname, '..', 'sim');
const sources = fs
  .readdirSync(SIM)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .map((f) => ({ file: f, src: fs.readFileSync(path.join(SIM, f), 'utf8') }));

/** String literal starting at `src[i]` (quote char), with `${}` replaced by `{}`. */
function readLiteral(src: string, i: number): { text: string; interpolated: boolean } {
  const q = src[i];
  let out = '';
  let interpolated = false;
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === '\\') {
      out += src[++j];
      continue;
    }
    if (c === q) return { text: out, interpolated };
    if (q === '`' && c === '$' && src[j + 1] === '{') {
      let depth = 0;
      let k = j + 1;
      for (; k < src.length; k++) {
        if (src[k] === '{') depth++;
        else if (src[k] === '}' && --depth === 0) break;
      }
      const expr = src.slice(j + 2, k);
      // Constants the catalog spells out.
      if (expr === 'RIVAL.name') out += 'Brightvend';
      else {
        out += '{}';
        interpolated = true;
      }
      j = k;
      continue;
    }
    out += c;
  }
  throw new Error('unterminated literal');
}

/** Literals right after each match of `re` (which must end just before the quote). */
function literalsAfter(re: RegExp, files = sources) {
  const out: { file: string; text: string; interpolated: boolean }[] = [];
  for (const { file, src } of files) {
    for (const m of src.matchAll(re)) {
      const i = m.index + m[0].length;
      if (!`'"\``.includes(src[i])) continue;
      out.push({ file, ...readLiteral(src, i) });
    }
  }
  return out;
}

/** English leaves under a prefix, placeholders normalized to `{}`. */
function normalizedLeaves(prefix: string): Set<string> {
  const out = new Set<string>();
  for (const [key, leaf] of Object.entries(CATALOGS.en ?? {})) {
    if (!key.startsWith(prefix)) continue;
    const forms = isPlural(leaf) ? [leaf.one, leaf.other] : [leaf];
    for (const f of forms) out.add(f.replace(/\$?\{\w+\}/g, '{}'));
  }
  return out;
}

const norm = (s: string) => s.replace(/\$\{\}/g, '{}');

describe('simError', () => {
  const found = [
    ...literalsAfter(/\bfail\(/g),
    ...literalsAfter(/\berror: /g),
    ...literalsAfter(/new SaveError\(/g),
    ...literalsAfter(
      /\breturn /g,
      sources.filter((s) => s.file === 'rules.ts'),
    ).filter((x) => /^[A-Z].* /.test(x.text)),
  ];

  it('finds the sim error messages', () => {
    expect(found.length).toBeGreaterThan(50);
  });

  it('every sim error has a catalog entry', () => {
    const leaves = normalizedLeaves('sim.errors.');
    const missing = found
      .filter((x) => !leaves.has(norm(x.text)) && !matchSimText('sim.errors.', x.text))
      .map((x) => x.text);
    expect(missing).toEqual([]);
  });

  it('literal errors map to a key and render unchanged in English', () => {
    for (const x of found.filter((f) => !f.interpolated)) {
      expect(matchSimText('sim.errors.', x.text)).not.toBeNull();
      expect(simError(x.text)).toBe(x.text);
    }
  });

  it('interpolated errors render unchanged in English', () => {
    const samples = [
      'Snack Machine is locked.',
      'Your van holds 40 items per trip.',
      "Northfield Cola doesn't fit this machine.",
      'Slot 3 holds 12.',
      'Unlocks in chapter 4.',
      'A route has at most 8 stops.',
      'Too close to Lincoln High (120 m). Keep 300 m from schools.',
      'Save is from a newer version (9).',
      'No migration from save version 2.',
      'Save is missing "machines".',
    ];
    for (const s of samples) {
      expect(matchSimText('sim.errors.', s)).not.toBeNull();
      expect(simError(s)).toBe(s);
    }
    expect(matchSimText('sim.errors.', 'Snack Machine is locked.')?.vars).toEqual({
      type: 'Snack Machine',
    });
  });

  it('passes unknown text through', () => {
    expect(simError('Something new happened.')).toBe('Something new happened.');
    expect(simError('Some Future Machine is locked.')).toBe('Some Future Machine is locked.');
    expect(matchSimText('sim.errors.', 'Something new happened.')).toBeNull();
  });
});

describe('logText', () => {
  const found = literalsAfter(/\blog\(\s*\w+,\s*'[\w-]+',\s*/g);
  const extra = ['Refrigeration failure', 'Coil jammed'];

  it('every log line has a catalog entry', () => {
    expect(found.length).toBeGreaterThan(20);
    const leaves = normalizedLeaves('sim.log.');
    const missing = found
      .map((x) => norm(x.text))
      // The contract-lost line takes its reason from lose(...): one key per reason.
      .filter((x) => x !== '{} ended your contract: {}. The machine is back in storage.')
      .filter((x) => !leaves.has(x));
    expect(missing).toEqual([]);
    for (const e of [...extra, 'Repaired by hand']) {
      expect(matchSimText('sim.log.', e)).not.toBeNull();
      expect(logText('breakdown', e)).toBe(e);
    }
  });

  it('renders every kind of line unchanged in English', () => {
    const samples: [string, string][] = [
      ['cash-full', 'Cash box full'],
      ['theft', 'Break-in: lost $12.50 and 3 items'],
      ['spoiled', '4 × Daybreak Sandwich spoiled'],
      [
        'contract-lost',
        'Joe: Coffee ended your contract: poor service. The machine is back in storage.',
      ],
      [
        'contract-lost',
        'City Gym ended your contract: Brightvend outbid you. The machine is back in storage.',
      ],
      ['contract-renewed', 'Street corner renewed your contract'],
      ['driver', 'Driver restocked 40 items across 3 machines'],
      ['chapter', 'Chapter 2 complete'],
      ['info', 'Placed Coffee Machine at Central Station'],
      ['info', 'Picked up machine from Central Station'],
      ['info', 'Order complete: Research 1 upgrade'],
      ['info', 'All orders done: day 3 streak'],
      ['info', 'Trophy: Open for business'],
      ['restock', 'Restocked 24 items'],
      ['event', 'Game night at Riverside Stadium'],
      ['rival', 'Brightvend pulled a machine out (55% share is yours).'],
      ['rival', 'Brightvend placed a machine near yours.'],
    ];
    for (const [kind, s] of samples) {
      expect(matchSimText('sim.log.', s)).not.toBeNull();
      expect(logText(kind, s)).toBe(s);
    }
    expect(matchSimText('sim.log.', 'Order complete: Take 500 in sales')?.key).toBe(
      'sim.log.orderComplete',
    );
    // Money from the sim (US cents / dollars) shows in the city's currency.
    expect(logText('info', 'Order complete: Take 50000 in sales')).toBe(
      'Order complete: Take $500 in sales',
    );
    useCurrency.setState({ currency: CURRENCIES.JPY });
    try {
      expect(logText('info', 'Order complete: Take 50000 in sales')).toBe(
        'Order complete: Take ¥75k in sales',
      );
      expect(logText('theft', 'Break-in: lost $12.50 and 3 items')).toBe(
        'Break-in: lost ¥1,875 and 3 items',
      );
    } finally {
      useCurrency.setState({ currency: CURRENCIES.USD });
    }
    expect(matchSimText('sim.log.', 'Placed Coffee Machine at Central Station')?.key).toBe(
      'sim.log.placed',
    );
    // Not an event name: no match, passes through.
    expect(matchSimText('sim.log.', 'Dinner at Home')).toBeNull();
    expect(logText('info', 'Dinner at Home')).toBe('Dinner at Home');
  });
});

describe('ledgerCategory', () => {
  const names = new Set<string>();
  for (const { src } of sources) {
    for (const line of src.split('\n')) {
      if (!/\b(addLedger|spend)\(/.test(line) || /function (addLedger|spend)/.test(line)) continue;
      for (const m of line.matchAll(/'([A-Z][\w ]*)'/g)) names.add(m[1]);
    }
  }

  it('every ledger category has a key and renders unchanged', () => {
    expect(names.size).toBeGreaterThan(20);
    for (const n of names) {
      expect(matchSimText('sim.ledger.', n)).not.toBeNull();
      expect(ledgerCategory(n)).toBe(n);
    }
    expect(ledgerCategory('Ad reward')).toBe('Ad reward');
  });
});

describe('spot reasons', () => {
  const spot = sources.filter((s) => s.file === 'spot.ts');
  const found = literalsAfter(/\btext: /g, spot);

  it('every reason has a catalog entry', () => {
    expect(found.length).toBeGreaterThan(8);
    const leaves = normalizedLeaves('sim.spot.');
    const missing = found
      .map((x) => norm(x.text))
      // Plural built in code; the catalog has one/other forms.
      .filter((x) => x !== 'Brightvend has {} machine{} within 250 m.')
      .filter((x) => !leaves.has(x));
    expect(missing).toEqual([]);
  });

  it('renders unchanged in English', () => {
    const samples = [
      'Most foot traffic comes from residents.',
      'Most foot traffic comes from convention center.',
      'Busiest around 08:00.',
      'Few people pass here. Sales will be slow.',
      'Hosted by Joe (Coffee) (Café).',
      'Crowded: 40% of customers go to competitors.',
      'No competition nearby.',
      'Brightvend has 1 machine within 250 m.',
      'Brightvend has 3 machines within 250 m.',
      'Isolated at night: higher theft risk.',
      'A hot food machine would fit this spot better.',
      'A drinks machine would fit this spot better.',
    ];
    for (const s of samples) {
      expect(matchSimText('sim.spot.', s)).not.toBeNull();
      expect(spotReason(s)).toBe(s);
      expect(logText('spotReason', s)).toBe(s);
    }
  });
});

describe('alerts and venues', () => {
  it('projected alert titles exist and render unchanged', () => {
    const projections = sources.filter((s) => s.file === 'projections.ts');
    const titles = literalsAfter(/\btitle: /g, projections).map((x) => x.text);
    expect(titles).toHaveLength(3);
    const leaves = normalizedLeaves('notify.');
    for (const s of titles) expect(leaves.has(s)).toBe(true);
    const bodies = literalsAfter(/\bbody: /g, projections).map((x) => norm(x.text));
    for (const s of bodies) expect(leaves.has(s)).toBe(true);
  });

  it('renders alert text unchanged in English', () => {
    const cases = [
      {
        kind: 'machine-empty' as const,
        title: 'Machine empty',
        body: 'Your Snack Machine at Union Square at Night has sold out.',
      },
      {
        kind: 'cash-full' as const,
        title: 'Cash box full',
        body: 'Collect cash at Street corner.',
      },
      { kind: 'event' as const, title: 'Local event starting nearby', body: 'Expo at Hall B.' },
    ];
    for (const c of cases) expect(alertText(c)).toEqual({ title: c.title, body: c.body });
  });

  it('maps placeholder venues', () => {
    expect(venueName('Street corner')).toBe('Street corner');
    expect(venueName('Storage')).toBe('Storage');
    expect(venueName('Joe’s')).toBe('Joe’s');
  });
});
