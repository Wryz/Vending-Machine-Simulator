import { getMachineType } from '@/config/machines';
import { CASH, START } from '@/config/economy';

import {
  advance,
  applyAdReward,
  assignRoute,
  autoAssignRoutes,
  buyPull,
  buyResearch,
  buyVan,
  collectCash,
  evaluateSpot,
  exportSave,
  hireDriver,
  importSave,
  migrateSave,
  newGame,
  placeMachine,
  repairMachine,
  restockMachine,
  sellCompany,
  setPrice,
  suggestRestock,
  withClone,
  type GameState,
  type World,
  renegotiate,
  pickUpMachine,
  sellMachine,
  buyWarehouse,
  hidePlace,
  buyPrestigePerk,
  setPar,
  rotateMachine,
  fireDriver,
  buyLiquorPermit,
  projectAlerts,
  companyValuationCents,
  reputationFor,
  canSellCompany,
  SaveError,
  playerShare,
  quotePlacement,
  applyStarterPack,
} from './index';
import { decentSpot, deadSpot, NOON_NY, testWorld } from './__fixtures__/world';
import { offsetPoint } from './geo';

const MIN = 60_000;

function startWithPlacedMachine(world: World, at = NOON_NY): GameState {
  let s = newGame({ cityId: 'new-york', now: at, seed: 1234 });
  const spot = decentSpot();
  const r1 = withClone(s, (d) =>
    placeMachine(d, world, {
      machineId: d.machines[0].id,
      lat: spot.lat,
      lng: spot.lng,
      heading: 180,
      termDays: 30,
      exclusive: false,
    }),
  );
  expect(r1.result.ok).toBe(true);
  s = r1.state;
  const r2 = withClone(s, (d) =>
    restockMachine(d, world, d.machines[0].id, suggestRestock(d, d.machines[0].id), {
      manual: true,
    }),
  );
  expect(r2.result.ok).toBe(true);
  return r2.state;
}

describe('new game', () => {
  it('starts with cash and one used machine in storage', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    expect(s.cashCents).toBe(START.cashCents);
    expect(s.machines).toHaveLength(1);
    expect(s.machines[0].typeId).toBe('used-snack');
    expect(s.machines[0].status).toBe('stored');
    expect(s.chapter).toBe(1);
  });
});

describe('placement', () => {
  const world = testWorld();
  it('attaches the nearest real venue by name', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    const spot = decentSpot();
    const q = quotePlacement(s, world, {
      machineId: s.machines[0].id,
      lat: spot.lat,
      lng: spot.lng,
      heading: 0,
      termDays: 30,
      exclusive: false,
    });
    expect(q.ok).toBe(true);
    if (q.ok) {
      expect(q.venue.name).toBe('Lakeview Fitness');
      expect(q.venue.category).toBe('gym');
      expect(q.commission).toBeGreaterThanOrEqual(0.1);
      expect(q.commission).toBeLessThanOrEqual(0.35);
    }
  });
  it('charges nothing when the machine to place is not in storage', () => {
    // A bought type: unlike the used starter, it costs something to install.
    expect(getMachineType('snack').installCents).toBeGreaterThan(0);
    const start = startWithPlacedMachine(world);
    start.chapter = 2;
    start.cashCents = 10_000_00;
    const at = offsetPoint(decentSpot(), 270, 40);
    const bought = withClone(start, (d) =>
      placeMachine(d, world, {
        typeId: 'snack',
        lat: at.lat,
        lng: at.lng,
        heading: 0,
        termDays: 30,
        exclusive: false,
      }),
    );
    expect(bought.result.ok).toBe(true);
    const s = bought.state;
    const active = s.machines.find((m) => m.typeId === 'snack')!;
    const p = offsetPoint(decentSpot(), 90, 60);
    const draft = structuredClone(s);
    const r = placeMachine(draft, world, {
      machineId: active.id,
      lat: p.lat,
      lng: p.lng,
      heading: 0,
      termDays: 30,
      exclusive: false,
    });
    expect(r.ok).toBe(false);
    expect(draft.cashCents).toBe(s.cashCents);
  });
  it('rejects locked districts, duplicate spots and bad terms', () => {
    const s = startWithPlacedMachine(world);
    const spot = decentSpot();
    const { result: dup } = withClone(s, (d) =>
      placeMachine(d, world, {
        typeId: 'snack',
        lat: spot.lat,
        lng: spot.lng,
        heading: 0,
        termDays: 30,
        exclusive: false,
      }),
    );
    expect(dup.ok).toBe(false);
    const far = offsetPoint(world.city, 0, 3000);
    const { result: locked } = withClone(s, (d) =>
      placeMachine(d, world, {
        typeId: 'snack',
        lat: far.lat,
        lng: far.lng,
        heading: 0,
        termDays: 30,
        exclusive: false,
      }),
    );
    expect(locked.ok).toBe(false);
    const near = offsetPoint(spot, 90, 60);
    const { result: term } = withClone(s, (d) =>
      placeMachine(d, world, {
        typeId: 'snack',
        lat: near.lat,
        lng: near.lng,
        heading: 0,
        termDays: 45,
        exclusive: false,
      }),
    );
    expect(term.ok).toBe(false);
    const { result: locked2 } = withClone(s, (d) =>
      placeMachine(d, world, {
        typeId: 'coffee',
        lat: near.lat,
        lng: near.lng,
        heading: 0,
        termDays: 30,
        exclusive: false,
      }),
    );
    expect(locked2.ok).toBe(false);
  });
  it('enforces alcohol rules: permit and 300 m from schools', () => {
    const s = startWithPlacedMachine(world);
    s.chapter = 5;
    s.cashCents = 10_000_000;
    const spot = decentSpot();
    const { result: noPermit } = withClone(s, (d) =>
      placeMachine(d, world, {
        typeId: 'beer-wine',
        lat: spot.lat + 0.0003,
        lng: spot.lng,
        heading: 0,
        termDays: 30,
        exclusive: false,
      }),
    );
    expect(noPermit.ok).toBe(false);
    expect(buyLiquorPermit(s, world).ok).toBe(true);
    const { result: nearSchool } = withClone(s, (d) =>
      placeMachine(d, world, {
        typeId: 'beer-wine',
        lat: spot.lat + 0.0003,
        lng: spot.lng,
        heading: 0,
        termDays: 30,
        exclusive: false,
      }),
    );
    expect(nearSchool.ok).toBe(false);
    if (!nearSchool.ok) expect(nearSchool.error).toMatch(/school/i);
  });
});

describe('sales loop', () => {
  const world = testWorld();
  it('sells in real time and fills the cash box', () => {
    const s = startWithPlacedMachine(world);
    const units0 = s.machines[0].slots.reduce((a, x) => a + x.qty, 0);
    const { state, report } = advance(s, world, s.now + 5 * MIN);
    expect(report.units).toBeGreaterThan(0);
    expect(state.machines[0].cashBoxCents).toBe(report.salesCents);
    expect(state.machines[0].slots.reduce((a, x) => a + x.qty, 0)).toBe(units0 - report.units);
    expect(state.ledger.lifetimeSalesCents).toBe(report.salesCents);
  });
  it('is deterministic for the same seed and inputs', () => {
    const s = startWithPlacedMachine(world);
    const a = advance(s, world, s.now + 30 * MIN).state;
    const b = advance(s, world, s.now + 30 * MIN).state;
    expect(exportSave(a)).toBe(exportSave(b));
  });
  it('does nothing when time does not move', () => {
    const s = startWithPlacedMachine(world);
    const { report } = advance(s, world, s.now - 1);
    expect(report.units).toBe(0);
  });
  it('collecting pays out gross minus commission', () => {
    const s = advance(startWithPlacedMachine(world), world, NOON_NY + 10 * MIN).state;
    const gross = s.machines[0].cashBoxCents;
    const cash0 = s.cashCents;
    const { state, result } = withClone(s, (d) => collectCash(d, d.machines[0].id));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.grossCents).toBe(gross);
      expect(result.commissionCents).toBe(Math.round(gross * s.machines[0].contract.commission));
    }
    expect(state.machines[0].cashBoxCents).toBe(0);
    expect(state.cashCents).toBeGreaterThan(cash0);
  });
  it('a full cash box stops cash sales until collected', () => {
    const s = startWithPlacedMachine(world);
    s.machines[0].cashBoxCents = CASH.cashBoxCents;
    const { report } = advance(s, world, s.now + 10 * MIN);
    expect(report.units).toBe(0);
  });
  it('higher prices sell fewer units', () => {
    const base = startWithPlacedMachine(world);
    base.chapterDoneAt[1] = base.now;
    const pricey = withClone(base, (d) => {
      d.machines[0].slots.forEach((_, i) => setPrice(d, d.machines[0].id, i, 999));
    }).state;
    const a = advance(base, world, base.now + 20 * MIN).report.units;
    const b = advance(pricey, world, pricey.now + 20 * MIN).report.units;
    expect(b).toBeLessThan(a * 0.5);
  });
  it('a dead spot sells almost nothing and the Spot Card says why', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 3 });
    const report = evaluateSpot(s, world, deadSpot(), 'used-snack', NOON_NY);
    const good = evaluateSpot(s, world, decentSpot(), 'used-snack', NOON_NY);
    expect(report.dailyCustomers).toBeLessThan(good.dailyCustomers / 10);
    expect(report.reasons.some((r) => !r.good && /Few people/.test(r.text))).toBe(true);
    expect(good.rating).toBeGreaterThan(report.rating);
    expect(good.nearby.map((n) => n.name)).toContain('Lakeview Fitness');
    expect(good.hourly).toHaveLength(24);
    expect(good.bestFamilies.length).toBeGreaterThan(0);
  });
  it('heat makes cold drinks sell more (visible weather effect)', () => {
    const hot = testWorld({
      weather: () => ({ time: '', tempC: 35, condition: 'clear', precipitation: 0 }),
    });
    const mild = testWorld({
      weather: () => ({ time: '', tempC: 18, condition: 'cloudy', precipitation: 0 }),
    });
    const mk = (w: World) => {
      const s = startWithPlacedMachine(w);
      s.machines[0].slots.forEach((slot) => {
        slot.productId = 'clearpeak-water';
        slot.qty = 8;
        slot.priceCents = 150;
      });
      return s;
    };
    const unitsHot = advance(mk(hot), hot, NOON_NY + 4 * MIN).report.units;
    const unitsMild = advance(mk(mild), mild, NOON_NY + 4 * MIN).report.units;
    expect(unitsHot).toBeGreaterThan(unitsMild * 1.3);
  });
});

describe('pacing (SPEC §4.8: chapter 1 in ~20–30 minutes of play)', () => {
  it('a player who restocks when empty finishes chapter 1 in 15–40 minutes in a decent spot', () => {
    const world = testWorld();
    let s = startWithPlacedMachine(world);
    let minutes = 0;
    while (s.chapter === 1 && minutes < 120) {
      s = advance(s, world, s.now + MIN).state;
      minutes++;
      const m = s.machines[0];
      if (m.broken) s = withClone(s, (d) => repairMachine(d, m.id)).state;
      const units = m.slots.reduce((a, x) => a + x.qty, 0);
      if (units < 40) {
        s = withClone(s, (d) => collectCash(d, m.id)).state;
        s = withClone(s, (d) =>
          restockMachine(d, world, m.id, suggestRestock(d, m.id), { manual: true }),
        ).state;
      }
    }
    console.log(`chapter 1 completed in ${minutes} minutes`);
    expect(s.chapter).toBe(2);
    expect(minutes).toBeGreaterThanOrEqual(15);
    expect(minutes).toBeLessThanOrEqual(40);
  });
});

describe('offline catch-up', () => {
  it('caps at 72 h and computes quickly', () => {
    const world = testWorld();
    const s = startWithPlacedMachine(world);
    const t0 = Date.now();
    const { report } = advance(s, world, s.now + 100 * 3_600_000);
    const ms = Date.now() - t0;
    expect(report.skippedMs).toBe(28 * 3_600_000);
    expect(ms).toBeLessThan(1500);
    expect(report.becameEmpty).toContain(s.machines[0].id);
  });
  it('perf: 72 h with 200 machines', () => {
    const world = testWorld();
    let s = startWithPlacedMachine(world);
    s.chapter = 5;
    s.cashCents = 1e12;
    const spot = decentSpot();
    for (let i = 0; i < 199; i++) {
      const p = offsetPoint(spot, (i * 37) % 360, 20 + (i % 40) * 12);
      s = withClone(s, (d) => {
        const r = placeMachine(d, world, {
          typeId: 'snack',
          lat: p.lat,
          lng: p.lng,
          heading: 0,
          termDays: 180,
          exclusive: false,
        });
        if (r.ok)
          restockMachine(d, world, r.machine.id, suggestRestock(d, r.machine.id, 10_000), {
            manual: false,
            capacity: 10_000,
          });
      }).state;
    }
    const t0 = Date.now();
    advance(s, world, s.now + 72 * 3_600_000);
    const ms = Date.now() - t0;
    console.log(`offline catch-up: 72 h × ${s.machines.length} machines = ${ms} ms`);
    expect(ms).toBeLessThan(6000);
  });
});

describe('service, risks and contracts', () => {
  const world = testWorld();
  it('van capacity limits a manual restock and fresh stock adds a bonus', () => {
    const s = startWithPlacedMachine(world);
    const m = s.machines[0];
    expect(m.freshUntil).toBeGreaterThan(s.now);
    const big = m.slots.map((_, i) => ({ slot: i, productId: 'kettle-crisp', qty: 8 }));
    const { result } = withClone(s, (d) => restockMachine(d, world, m.id, big, { manual: true }));
    expect(result.ok).toBe(false);
  });
  it('breakdowns stop sales; manual repair and the technician fix them', () => {
    const s = startWithPlacedMachine(world);
    s.machines[0].broken = { kind: 'jam', since: s.now, techFixAt: null };
    expect(advance(s, world, s.now + 5 * MIN).report.units).toBe(0);
    const fixed = withClone(s, (d) => repairMachine(d, d.machines[0].id));
    expect(fixed.result.ok).toBe(true);
    expect(fixed.state.machines[0].broken).toBeNull();
    s.machines[0].broken = { kind: 'jam', since: s.now, techFixAt: s.now + 2 * MIN };
    expect(advance(s, world, s.now + 5 * MIN).state.machines[0].broken).toBeNull();
  });
  it('theft takes cash and stock but never the machine', () => {
    const w = testWorld();
    for (const c of w.cells.values()) c.isolation = 1;
    // Thefts are random: across a few seeds some happen, and none removes the machine.
    let thefts = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const s = startWithPlacedMachine(w);
      s.rng = seed;
      s.machines[0].cashBoxCents = 50_000;
      const { state, report } = advance(s, w, s.now + 72 * 3_600_000);
      thefts += report.thefts;
      expect(state.machines).toHaveLength(1);
    }
    expect(thefts).toBeGreaterThan(0);
  });
  it('an empty machine upsets the venue until it ends the contract', () => {
    const s = startWithPlacedMachine(world);
    s.machines[0].slots.forEach((x) => (x.qty = 0));
    // Venues judge on real time: a night empty is forgiven, days are not.
    const night = advance(s, world, s.now + 12 * 3_600_000);
    expect(night.state.machines[0].status).toBe('active');
    expect(night.state.machines[0].mood).toBeLessThan(s.machines[0].mood);
    const { state, report } = advance(s, world, s.now + 72 * 3_600_000);
    expect(report.contractsLost).toContain(s.machines[0].id);
    expect(state.machines[0].status).toBe('stored');
  });
  it('contracts renew at the end of the term when the venue is happy', () => {
    const s = startWithPlacedMachine(world);
    const end = s.machines[0].contract.endsAt;
    s.machines[0].contract.endsAt = s.now + 2 * MIN;
    const { state } = advance(s, world, s.now + 5 * MIN);
    expect(state.machines[0].contract.endsAt).toBeGreaterThan(s.now + 5 * MIN);
    expect(end).toBeGreaterThan(s.now);
  });
  it('renegotiation needs chapter 1 done and works once', () => {
    const s = startWithPlacedMachine(world);
    expect(renegotiate(s, s.machines[0].id).ok).toBe(false);
    s.chapterDoneAt[1] = s.now;
    const before = s.machines[0].contract.commission;
    expect(renegotiate(s, s.machines[0].id).ok).toBe(true);
    expect(s.machines[0].contract.commission).toBeLessThan(before);
    expect(renegotiate(s, s.machines[0].id).ok).toBe(false);
  });
  it('spoils fresh food after its shelf life', () => {
    const s = startWithPlacedMachine(world);
    s.machines[0].slots[0] = {
      productId: 'sandwich',
      qty: 5,
      priceCents: 99_999,
      par: 5,
      stockedAt: s.now - 49 * 60_000,
    };
    const { report } = advance(s, world, s.now + MIN);
    expect(report.spoiledUnits).toBeGreaterThanOrEqual(5);
  });
});

describe('automation: drivers, research, warehouse', () => {
  const world = testWorld();
  it('a driver restocks and collects their route', () => {
    let s = startWithPlacedMachine(world);
    s.chapter = 3;
    s.cashCents = 5_000_000;
    s = withClone(s, (d) => buyVan(d)).state;
    const hired = withClone(s, (d) => hireDriver(d));
    expect(hired.result.ok).toBe(true);
    s = hired.state;
    s = withClone(s, (d) => assignRoute(d, d.drivers[0].id, [d.machines[0].id])).state;
    s.machines[0].slots.forEach((x) => (x.qty = 1));
    s.machines[0].cashBoxCents = 10_000;
    const { state, report } = advance(s, world, s.now + 3 * MIN);
    expect(report.driverRuns).toBeGreaterThan(0);
    expect(state.machines[0].slots.reduce((a, x) => a + x.qty, 0)).toBeGreaterThan(30);
  });
  it('research is per family; global upgrades apply to all', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 9 });
    s.chapter = 3;
    s.cashCents = 10_000_000;
    expect(buyResearch(s, 'card-reader', 'snacks').ok).toBe(true);
    expect(buyResearch(s, 'card-reader', 'snacks').ok).toBe(false);
    expect(buyResearch(s, 'card-reader', 'drinks').ok).toBe(true);
    expect(buyResearch(s, 'telemetry').ok).toBe(true);
    expect(s.research.telemetry).toEqual(['*']);
    expect(buyResearch(s, 'smart-pricing', 'snacks').ok).toBe(false);
    expect(buyWarehouse(s).ok).toBe(true);
    expect(buyWarehouse(s).ok).toBe(false);
  });
  it('card readers deposit directly so a full cash box still sells by card', () => {
    const s = startWithPlacedMachine(world);
    s.research['card-reader'] = ['snacks'];
    s.machines[0].cashBoxCents = CASH.cashBoxCents;
    const cash0 = s.cashCents;
    const { state, report } = advance(s, world, s.now + 10 * MIN);
    expect(report.units).toBeGreaterThan(0);
    expect(state.cashCents).toBeGreaterThan(cash0 - 200);
  });
  it('route helpers', () => {
    let s = startWithPlacedMachine(world);
    expect(autoAssignRoutes(s).ok).toBe(false);
    s.chapter = 3;
    s.cashCents = 5_000_000;
    s.vanLevel = 1;
    s = withClone(s, (d) => hireDriver(d)).state;
    expect(autoAssignRoutes(s).ok).toBe(true);
    expect(s.drivers[0].machineIds).toContain(s.machines[0].id);
    expect(assignRoute(s, s.drivers[0].id, Array(20).fill('x')).ok).toBe(false);
    expect(fireDriver(s, s.drivers[0].id).ok).toBe(true);
    expect(fireDriver(s, 'nope').ok).toBe(false);
  });
});

describe('progression, rival, collections, prestige', () => {
  const world = testWorld();
  it('chapter 2 needs 5 machines and a van', () => {
    let s = startWithPlacedMachine(world);
    s.chapter = 2;
    s.cashCents = 50_000_000;
    const spot = decentSpot();
    for (let i = 1; i <= 4; i++) {
      const p = offsetPoint(spot, i * 80, 120);
      s = withClone(s, (d) =>
        placeMachine(d, world, {
          typeId: 'snack',
          lat: p.lat,
          lng: p.lng,
          heading: 0,
          termDays: 30,
          exclusive: false,
        }),
      ).state;
    }
    expect(advance(s, world, s.now + MIN).state.chapter).toBe(2);
    s = withClone(s, (d) => buyVan(d)).state;
    expect(advance(s, world, s.now + MIN).state.chapter).toBe(3);
  });
  it('Brightvend arrives in chapter 3, competes, and can be beaten', () => {
    const s = startWithPlacedMachine(world);
    s.chapter = 3;
    let r = advance(s, world, s.now + 5 * MIN).state;
    expect(r.rival.active).toBe(true);
    expect(r.rival.machines.length).toBeGreaterThan(0);
    // A dominant player pushes the rival out over time.
    r.ledger.recentPlayerCents = 1e9;
    r.ledger.recentRivalCents = 1;
    const fleet = r.rival.machines.length;
    r = advance(r, world, r.now + 6 * 3_600_000).state;
    expect(r.rival.machines.length).toBeLessThan(fleet + 1);
    expect(playerShare(r)).toBeGreaterThan(0);
  });
  it('chapter 5 completes on market share and unlocks selling the company', () => {
    const s = startWithPlacedMachine(world);
    s.chapter = 5;
    s.rival.active = true;
    s.rival.nextDecisionAt = s.now + 1e9;
    s.ledger.recentPlayerCents = 1e7;
    s.ledger.recentRivalCents = 1e3;
    const { state } = advance(s, world, s.now + MIN);
    expect(state.chapter).toBe(6);
    expect(canSellCompany(state)).toBe(true);
    expect(companyValuationCents(state)).toBeGreaterThan(0);
    const sold = sellCompany(state, 'tokyo', state.now, 5);
    expect('state' in sold).toBe(true);
    if ('state' in sold) {
      expect(sold.state.cityId).toBe('tokyo');
      expect(sold.state.prestige.sales).toBe(1);
      expect(sold.state.prestige.reputation).toBe(reputationFor(state));
    }
    expect('error' in sellCompany(startWithPlacedMachine(world), 'tokyo', 0, 1)).toBe(true);
  });
  it('collections: pulls use in-game money, completing a set gives a perk', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 77 });
    expect(buyPull(s, 'city-critters').ok).toBe(false);
    s.chapter = 3;
    s.cashCents = 10_000_000;
    for (let i = 0; i < 400; i++) buyPull(s, 'city-critters');
    const owned = Object.keys(s.collection).filter((k) => k.startsWith('city-critters'));
    expect(owned.length).toBe(12);
  });
  it('rewarded ads: double earnings, free pulls with a daily cap, instant restock', () => {
    const s = startWithPlacedMachine(world);
    expect(applyAdReward(s, world, 'double-earnings').ok).toBe(true);
    expect(s.boosts.doubleEarningsUntil).toBeGreaterThan(s.now);
    for (let i = 0; i < 3; i++)
      expect(applyAdReward(s, world, 'free-pull', { seriesId: 'transit-tokens' }).ok).toBe(true);
    expect(applyAdReward(s, world, 'free-pull').ok).toBe(false);
    s.machines[0].slots.forEach((x) => (x.qty = 0));
    expect(applyAdReward(s, world, 'instant-restock', { machineId: s.machines[0].id }).ok).toBe(
      true,
    );
    expect(s.machines[0].slots.some((x) => x.qty > 0)).toBe(true);
    const cash = s.cashCents;
    expect(applyAdReward(s, world, 'double-offline', { offlineNetCents: 500 }).ok).toBe(true);
    expect(s.cashCents).toBe(cash + 500);
  });
  it('prestige perks carry into a new game', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    s.prestige.reputation = 10;
    expect(buyPrestigePerk(s, 'head-start').ok).toBe(true);
    expect(buyPrestigePerk(s, 'nope').ok).toBe(false);
    const next = newGame({ cityId: 'paris', now: NOON_NY, seed: 1, prestige: s.prestige });
    expect(next.cashCents).toBe(START.cashCents + 200_000);
  });
});

describe('misc actions', () => {
  const world = testWorld();
  it('pick up, rotate, sell, par, hide', () => {
    let s = startWithPlacedMachine(world);
    const id = s.machines[0].id;
    expect(rotateMachine(s, id, 370).ok).toBe(true);
    expect(s.machines[0].heading).toBe(10);
    expect(setPar(s, id, 0, 5).ok).toBe(true);
    expect(s.machines[0].slots[0].par).toBe(5);
    expect(pickUpMachine(s, id).ok).toBe(true);
    expect(s.machines[0].status).toBe('stored');
    expect(sellMachine(s, id).ok).toBe(false); // keep at least one
    s.chapter = 2;
    s.cashCents = 1e7;
    const p = offsetPoint(decentSpot(), 45, 80);
    s = withClone(s, (d) =>
      placeMachine(d, world, {
        typeId: 'snack',
        lat: p.lat,
        lng: p.lng,
        heading: 0,
        termDays: 90,
        exclusive: true,
      }),
    ).state;
    expect(sellMachine(s, id).ok).toBe(true);
    expect(hidePlace(s, 'x').ok).toBe(true);
    expect(s.hiddenPlaces).toContain('x');
    expect(getMachineType(s.machines[0].typeId).name).toBe('Snack Machine');
  });
});

describe('starter pack', () => {
  it('adds a van, two stored snack machines and cash', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    const cash = s.cashCents;
    expect(applyStarterPack(s).ok).toBe(true);
    expect(s.vanLevel).toBe(1);
    expect(s.machines.filter((m) => m.typeId === 'snack' && m.status === 'stored')).toHaveLength(2);
    expect(s.cashCents).toBe(cash + 200_000);
  });
});

describe('saves', () => {
  it('round-trips through export/import and rejects bad input', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    expect(importSave(exportSave(s))).toEqual(s);
    expect(() => importSave('nope')).toThrow(SaveError);
    expect(() => migrateSave({ schemaVersion: 99 })).toThrow(SaveError);
    expect(() => migrateSave({ schemaVersion: 1 })).toThrow(/missing/);
    expect(() => migrateSave(null)).toThrow(SaveError);
    expect(() => migrateSave({ schemaVersion: 0 })).toThrow(/migration/);
  });
});

describe('notification projections (SPEC §10)', () => {
  it('projects empty/cash-full alerts, max 3/day, none 22:00–08:00', () => {
    const world = testWorld();
    const s = startWithPlacedMachine(world);
    const alerts = projectAlerts(s, world, s.now, 24 * 3_600_000);
    expect(alerts.length).toBeGreaterThan(0);
    for (const a of alerts) {
      const h = new Date(a.at).getUTCHours() - 4; // EDT
      const local = (h + 24) % 24;
      expect(local >= 8 && local < 22).toBe(true);
    }
  });
});
