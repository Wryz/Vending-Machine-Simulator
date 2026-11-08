import { LIFE_PEOPLE_MODELS, LIFE_POSES, MAP_LIFE } from '@/config/mapLife';
import { nextRandom, type RngState } from '@/sim/rng';

import { peopleActivity, peopleTarget } from './density';
import { RoadNetwork, type RoadHit } from './network';
import { Surface } from './surface';
import type {
  AsphaltInput,
  Customer,
  LifeConditions,
  LifeMachine,
  LifeSurfaceInput,
  LifeView,
  Person,
  RoadInput,
  RoadKind,
  VisitStage,
} from './types';

/**
 * Street-life simulation (pure, deterministic for a seed and a sequence of
 * calls): people walk the sidewalks of the rendered streets (just outside the
 * drawn asphalt), park paths and pedestrian streets, and customers walk up to
 * machines. Nobody walks on water or along another road's asphalt: each
 * walking line is checked against the rendered water and roads (`Surface`)
 * when first used. Positions are in local meters (east, north) around the network
 * origin, mirrored to lng/lat for the map each step.
 *
 * Allocation-light: agents are plain objects mutated in place, dead ones are
 * compacted out of the arrays, scratch vectors are reused.
 */

const P = MAP_LIFE.people;
const CU = MAP_LIFE.customers;
const VI = CU.visit;
const BR = MAP_LIFE.browsers;
const kmh = (v: number) => v / 3.6;
const DEG = Math.PI / 180;
/** Walk cycle over 4 steps: left stride, passing, right stride, passing. */
const WALK_CYCLE = [1, 0, 2, 0] as const;
/** Chord half-span for smoothed tangents. */
const PED_SPAN = 2;
/** Positional smoothing after switching roads, seconds. */
const PED_BLEND_TAU = 0.5;
const SAMPLE_M = MAP_LIFE.surface.sampleM;

/** Middle of a kind's walking band (where its line is checked against the surface). */
const midOffset = (kind: RoadKind) => {
  const [lo, hi] = P.sidewalkOffsetM[kind];
  return kind === 'major' || kind === 'minor' ? (lo + hi) / 2 : 0;
};

interface Vec {
  x: number;
  y: number;
}

/** A machine in network-local meters (for window shoppers). */
interface LocalMachine {
  m: LifeMachine;
  x: number;
  y: number;
}

interface Candidate {
  road: number;
  s: number;
  dir: 1 | -1;
  align: number;
  d: number;
}

export class StreetLife {
  readonly people: Person[] = [];
  /** People walking up to a machine to buy (see addCustomer). */
  readonly customers: Customer[] = [];
  net: RoadNetwork | null = null;
  /** Water and drawn asphalt around the walkways (set with the roads). */
  surface: Surface | null = null;
  /** How many people the view should have. */
  targetPeople = 0;

  private readonly rng: RngState;
  private nextId = 1;
  private view: LifeView | null = null;
  private box = { x0: 0, y0: 0, x1: 0, y1: 0 };
  private cx = 0;
  private cy = 0;
  private radius = 0;
  private conditions: LifeConditions = { hour: 12, restDay: false, footTraffic: 0 };
  private pedCum: Float64Array = new Float64Array(0);
  /**
   * Blocked samples per walking line (key road * 2 + side), every SAMPLE_M
   * meters, computed the first time someone uses the line.
   */
  private readonly lines = new Map<number, Uint8Array>();
  /** Fractional spawns owed (spawning is rate-limited). */
  private budget = 0;
  private readonly v1: Vec = { x: 0, y: 0 };
  private readonly v2: Vec = { x: 0, y: 0 };
  private readonly hits: RoadHit[] = [];
  private readonly proj: RoadHit = { road: 0, s: 0, d: 0 };
  private readonly cands: Candidate[] = [];
  /** Sales whose customer bent to the tray since the last takeArrivals(). */
  private arrivals: string[] = [];
  /** Machines window shoppers may visit (see setMachines). */
  private machines: readonly LifeMachine[] = [];
  private local: LocalMachine[] = [];
  /** Window-shopper spawn budget and the (random) amount the next one costs. */
  private browseBudget = 0;
  private browseNext = 1;

  constructor(seed = 1) {
    this.rng = { rng: seed | 0 };
  }

  private rand(): number {
    return nextRandom(this.rng);
  }

  private uniform(a: number, b: number): number {
    return a + (b - a) * this.rand();
  }

  setConditions(c: LifeConditions): void {
    this.conditions = c;
    this.updateTargets();
  }

  /** Move the view (pan/zoom) without new road data. */
  setView(view: LifeView): void {
    this.view = view;
    if (!this.net) return;
    this.box = this.net.boxToLocal(view.bounds);
    [this.cx, this.cy] = this.net.toLocal(view.center[0], view.center[1]);
    this.radius = view.radiusM;
    this.updateTargets();
  }

  /**
   * New road data (after the camera settles). Agents already on screen are
   * re-attached to the new network so a small pan doesn't reset the street.
   * `surface`: the drawn asphalt (defaults to the walked streets) and water.
   */
  setRoads(roads: readonly RoadInput[], view: LifeView, surface: LifeSurfaceInput = {}): void {
    const old = this.net;
    const net = new RoadNetwork(roads, view.center);
    this.net = net;
    const asphalt =
      surface.asphalt ??
      roads.filter((r): r is AsphaltInput => r.kind === 'major' || r.kind === 'minor');
    this.surface = new Surface(asphalt, surface.water ?? [], view.center);
    this.lines.clear();
    this.setView(view);
    this.pedCum = this.weights(net);
    if (old) {
      for (const p of this.people) this.reattachPerson(p, net);
      for (const c of this.customers) this.remapCustomer(c, old, net);
    }
    this.localizeMachines();
    // First fill: populate the view at once (each person fades in).
    if (!this.people.length) for (let i = 0; i < this.targetPeople; i++) this.spawnPerson(false);
  }

  /** Drop everything (e.g. city change). */
  clear(): void {
    this.people.length = 0;
    this.customers.length = 0;
    this.arrivals.length = 0;
    this.local.length = 0;
    this.net = null;
    this.surface = null;
    this.lines.clear();
  }

  private updateTargets() {
    if (!this.net || !this.view) {
      this.targetPeople = 0;
      return;
    }
    const lengths = this.net.lengthWithin(this.box, this.cx, this.cy, this.radius);
    this.targetPeople = peopleTarget(this.conditions, lengths);
  }

  /** Cumulative spawn weights: road length × walking lines × people per km for its kind. */
  private weights(net: RoadNetwork): Float64Array {
    const cum = new Float64Array(net.roads.length);
    let acc = 0;
    net.roads.forEach((r, i) => (cum[i] = acc += r.length * P.lines[r.kind] * P.perKm[r.kind]));
    return cum;
  }

  /**
   * May nobody walk here? Distance `s` along road `ri` on its `side` walking
   * line (paths: the way itself): water, or another road's asphalt alongside.
   */
  lineBlocked(ri: number, side: 1 | -1, s: number): boolean {
    const net = this.net;
    const surface = this.surface;
    if (!net || !surface) return false;
    const road = net.roads[ri];
    const centered = road.kind === 'path' || road.kind === 'pedestrian';
    const key = ri * 2 + (centered || side > 0 ? 1 : 0);
    let line = this.lines.get(key);
    if (!line) {
      const n = Math.floor(road.length / SAMPLE_M) + 1;
      line = new Uint8Array(n);
      const off = midOffset(road.kind) * side;
      const pt = { x: 0, y: 0 };
      const tg = { x: 0, y: 0 };
      for (let i = 0; i < n; i++) {
        const si = Math.min(road.length, i * SAMPLE_M);
        net.pointAt(road, si, pt);
        net.tangentAt(road, si, PED_SPAN, tg);
        const x = pt.x + tg.y * off;
        const y = pt.y - tg.x * off;
        // Sidewalks may cross a street at a corner; paths stop at the curb.
        const blocked = centered
          ? surface.blockedPoint(x, y)
          : surface.blockedWalk(x, y, tg.x, tg.y);
        line[i] = blocked ? 1 : 0;
      }
      this.lines.set(key, line);
    }
    // Blocked if either neighboring sample is (conservative by up to a sample).
    const u = Math.min(road.length, Math.max(0, s)) / SAMPLE_M;
    const last = line.length - 1;
    return line[Math.min(last, Math.floor(u))] === 1 || line[Math.min(last, Math.ceil(u))] === 1;
  }

  private pickRoad(cum: Float64Array): number {
    const total = cum.length ? cum[cum.length - 1] : 0;
    if (total <= 0) return -1;
    const u = this.rand() * total;
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  inView(x: number, y: number, pad = 0): boolean {
    const b = this.box;
    if (x < b.x0 - pad || x > b.x1 + pad || y < b.y0 - pad || y > b.y1 + pad) return false;
    const r = this.radius + pad;
    return (x - this.cx) ** 2 + (y - this.cy) ** 2 <= r * r;
  }

  // -------------------------------------------------------------- people

  spawnPerson(edge: boolean): boolean {
    const net = this.net;
    if (!net) return false;
    const pad = MAP_LIFE.viewPaddingM;
    for (let tries = 0; tries < 16; tries++) {
      const ri = this.pickRoad(this.pedCum);
      if (ri < 0) return false;
      const road = net.roads[ri];
      const s = this.uniform(1, road.length - 1);
      const dir: 1 | -1 = this.rand() < 0.5 ? 1 : -1;
      const side: 1 | -1 = this.rand() < 0.5 ? 1 : -1;
      const [lo, hi] = P.sidewalkOffsetM[road.kind];
      const offset = this.uniform(lo, hi);
      net.pointAt(road, s, this.v1);
      net.tangentAt(road, s, PED_SPAN, this.v2);
      const x = this.v1.x + this.v2.y * side * offset;
      const y = this.v1.y - this.v2.x * side * offset;
      if (edge) {
        if (this.inView(x, y) || !this.inView(x, y, pad * 0.6)) continue;
        if (this.v2.x * dir * (this.cx - x) + this.v2.y * dir * (this.cy - y) <= 0) continue;
      } else if (!this.inView(x, y)) continue;
      if (this.lineBlocked(ri, side, s)) continue;
      const speed = kmh(this.uniform(P.speedKmh[0], P.speedKmh[1]));
      const p: Person = {
        id: this.nextId++,
        model: Math.floor(this.rand() * LIFE_PEOPLE_MODELS.length),
        road: ri,
        s,
        dir,
        side,
        offset,
        speed,
        phase: this.rand() * P.strideM * 4,
        pause: 0,
        x,
        y,
        hx: this.v2.x * dir,
        hy: this.v2.y * dir,
        bx: 0,
        by: 0,
        alpha: 0,
        dying: false,
        lng: 0,
        lat: 0,
        heading: 0,
        frame: 0,
      };
      this.finishPose(p);
      this.people.push(p);
      return true;
    }
    return false;
  }

  private reattachPerson(p: Person, net: RoadNetwork) {
    const [x, y] = net.toLocal(p.lng, p.lat);
    const hits = net.near(x, y, p.offset + 2, this.hits);
    let best: RoadHit | null = null;
    let bestScore = -Infinity;
    let bestDir: 1 | -1 = 1;
    let bestSide: 1 | -1 = 1;
    for (const h of hits) {
      const r = net.roads[h.road];
      if (Math.abs(h.d - p.offset) > 1.5) continue;
      net.tangentAt(r, h.s, PED_SPAN, this.v2);
      const dot = this.v2.x * p.hx + this.v2.y * p.hy;
      if (Math.abs(dot) < 0.8) continue;
      net.pointAt(r, h.s, this.v1);
      // Which side of the centerline is the person on?
      const cross = (x - this.v1.x) * this.v2.y - (y - this.v1.y) * this.v2.x;
      const score = Math.abs(dot) - Math.abs(h.d - p.offset) * 0.3;
      if (score > bestScore) {
        bestScore = score;
        best = h;
        bestDir = dot > 0 ? 1 : -1;
        bestSide = cross >= 0 ? 1 : -1;
      }
    }
    p.x = x;
    p.y = y;
    if (!best) {
      p.road = -1;
      p.dying = true;
      return;
    }
    p.road = best.road;
    p.s = best.s;
    p.dir = bestDir;
    p.side = bestSide;
    p.offset = best.d;
    // New water / asphalt data says nobody walks here: fade out.
    if (this.lineBlocked(p.road, p.side, p.s)) p.dying = true;
    this.personTarget(p, net);
    p.bx = x - this.v1.x;
    p.by = y - this.v1.y;
  }

  private stepPeople(dt: number) {
    const net = this.net!;
    const fade = dt / MAP_LIFE.fadeSeconds;
    for (const p of this.people) {
      if (p.dying) p.alpha = Math.max(0, p.alpha - fade);
      else p.alpha = Math.min(1, p.alpha + fade);
      if (p.road < 0) continue;
      const road = net.roads[p.road];
      if (p.pause > 0) {
        p.pause -= dt;
        p.frame = 0;
      } else {
        if (this.rand() < P.stopChancePerS * dt)
          p.pause = this.uniform(P.stopSeconds[0], P.stopSeconds[1]);
        const ds = p.speed * dt;
        p.s += ds * p.dir;
        p.phase += ds;
        p.frame = WALK_CYCLE[Math.floor(p.phase / P.strideM) % 4];
        if (p.s >= 0 && p.s <= road.length && this.lineBlocked(p.road, p.side, p.s)) {
          // Water or asphalt ahead: turn back after a moment.
          p.s -= ds * p.dir;
          p.dir = p.dir === 1 ? -1 : 1;
          p.pause = this.uniform(0.6, 1.6);
        } else if (p.s > road.length || p.s < 0) {
          if (!this.transfer(p)) {
            // Dead end: turn around after a moment.
            p.s = Math.min(road.length, Math.max(0, p.s));
            p.dir = p.dir === 1 ? -1 : 1;
            p.pause = this.uniform(0.6, 1.6);
          }
        }
      }
      this.posePerson(p, net, dt);
    }
  }

  /** Sidewalk position (no smoothing offset) into v1, road tangent into v2. */
  private personTarget(p: Person, net: RoadNetwork) {
    const road = net.roads[p.road];
    net.pointAt(road, p.s, this.v1);
    net.tangentAt(road, p.s, PED_SPAN, this.v2);
    this.v1.x += this.v2.y * p.side * p.offset;
    this.v1.y -= this.v2.x * p.side * p.offset;
  }

  private posePerson(p: Person, net: RoadNetwork, dt: number) {
    this.personTarget(p, net);
    const decay = Math.exp(-dt / PED_BLEND_TAU);
    p.bx *= decay;
    p.by *= decay;
    const x = this.v1.x + p.bx;
    const y = this.v1.y + p.by;
    if (p.pause <= 0)
      this.turnToward(p, x - p.x, y - p.y, this.v2.x * p.dir, this.v2.y * p.dir, 400 * dt, dt);
    p.x = x;
    p.y = y;
    this.finishPose(p);
  }

  // ----------------------------------------------------------- customers

  /**
   * Send a customer to a machine for a sale: they appear on the nearest
   * sidewalk a few meters away, walk to the front of the machine, look,
   * think, bend down to the tray (the sale is released, see takeArrivals),
   * stand, and walk on. Returns false when there's no road data yet or too
   * many are already on their way (the caller shows that sale at once).
   */
  addCustomer(saleId: string, lng: number, lat: number, headingDeg: number): boolean {
    if (!this.net) return false;
    let buyers = 0;
    for (const c of this.customers) if (c.saleId !== null) buyers++;
    if (buyers >= CU.max) return false;
    return this.visit(saleId, lng, lat, headingDeg);
  }

  /**
   * Machines window shoppers may visit (only those in view get any). Cheap to
   * call with the same list; positions follow the road network.
   */
  setMachines(machines: readonly LifeMachine[]): void {
    if (machines === this.machines) return;
    this.machines = machines;
    this.localizeMachines();
  }

  private localizeMachines() {
    const net = this.net;
    this.local.length = 0;
    if (!net) return;
    for (const m of this.machines) {
      const [x, y] = net.toLocal(m.lng, m.lat);
      this.local.push({ m, x, y });
    }
  }

  /** New network origin: keep visitors where they are on the ground. */
  private remapCustomer(c: Customer, old: RoadNetwork, net: RoadNetwork) {
    const ll = { lng: 0, lat: 0 };
    const move = (x: number, y: number): [number, number] => {
      old.toLngLatInto(x, y, ll);
      return net.toLocal(ll.lng, ll.lat);
    };
    [c.x, c.y] = move(c.x, c.y);
    [c.mx, c.my] = move(c.mx, c.my);
    [c.standX, c.standY] = move(c.standX, c.standY);
    [c.exitX, c.exitY] = move(c.exitX, c.exitY);
  }

  /** A visit to a machine: a sale's customer, or a window shopper (saleId null). */
  private visit(saleId: string | null, lng: number, lat: number, headingDeg: number): boolean {
    const net = this.net;
    if (!net) return false;
    const [mx, my] = net.toLocal(lng, lat);
    const fx = Math.sin(headingDeg * DEG);
    const fy = Math.cos(headingDeg * DEG);
    // A couple of people at one machine stand side by side.
    let queued = 0;
    for (const c of this.customers) if (c.mx === mx && c.my === my && !c.dying) queued++;
    const side = queued % 2 === 0 ? 1 : -1;
    const spread = Math.ceil(queued / 2) * 0.7 * side;
    const standX = mx + fx * CU.standM + fy * spread;
    const standY = my + fy * CU.standM - fx * spread;

    // Start and exit on the nearest sidewalk, on the machine's side of the
    // street; never in water or on asphalt (else they appear at the machine).
    const clear = (x: number, y: number) => !this.surface?.blockedPoint(x, y);
    let sx = standX;
    let sy = standY;
    let ex = standX;
    let ey = standY;
    const hits = net.near(mx, my, CU.sidewalkSearchM, this.hits);
    let best: RoadHit | null = null;
    for (const h of hits) if (!best || h.d < best.d) best = h;
    if (best) {
      const road = net.roads[best.road];
      const bestS = best.s;
      net.pointAt(road, bestS, this.v1);
      net.tangentAt(road, bestS, PED_SPAN, this.v2);
      const cross = (mx - this.v1.x) * this.v2.y - (my - this.v1.y) * this.v2.x;
      const sideSign = cross >= 0 ? 1 : -1;
      const [lo, hi] = P.sidewalkOffsetM[road.kind];
      const off = this.uniform(lo, hi);
      const dir = this.rand() < 0.5 ? 1 : -1;
      const at = (ds: number, out: Vec) => {
        const s = Math.min(road.length, Math.max(0, bestS + ds));
        net.pointAt(road, s, out);
        net.tangentAt(road, s, PED_SPAN, this.v2);
        out.x += this.v2.y * sideSign * off;
        out.y -= this.v2.x * sideSign * off;
      };
      const startM = this.uniform(CU.startM[0], CU.startM[1]);
      const exitM = this.uniform(CU.exitM[0], CU.exitM[1]);
      // Either way along the sidewalk, whichever is open.
      for (const d of [dir, -dir]) {
        at(d * startM, this.v1);
        if (!clear(this.v1.x, this.v1.y)) continue;
        sx = this.v1.x;
        sy = this.v1.y;
        break;
      }
      for (const d of [-dir, dir]) {
        at(d * exitM, this.v1);
        if (!clear(this.v1.x, this.v1.y)) continue;
        ex = this.v1.x;
        ey = this.v1.y;
        break;
      }
    } else {
      // No sidewalk nearby: come from somewhere in front of the machine.
      const a = this.uniform(-1, 1);
      const r = this.uniform(CU.startM[0], CU.startM[1]);
      const ax = standX + (fx * Math.cos(a) - fy * Math.sin(a)) * r;
      const ay = standY + (fy * Math.cos(a) + fx * Math.sin(a)) * r;
      const bx = standX + (fx * Math.cos(-a) - fy * Math.sin(-a)) * r;
      const by = standY + (fy * Math.cos(-a) + fx * Math.sin(-a)) * r;
      if (clear(ax, ay)) {
        sx = ax;
        sy = ay;
      }
      if (clear(bx, by)) {
        ex = bx;
        ey = by;
      }
    }
    const dx = standX - sx;
    const dy = standY - sy;
    const len = Math.hypot(dx, dy) || 1;
    const c: Customer = {
      id: this.nextId++,
      model: Math.floor(this.rand() * LIFE_PEOPLE_MODELS.length),
      road: -1,
      s: 0,
      dir: 1,
      side: 1,
      offset: 0,
      speed: kmh(CU.speedKmh),
      phase: 0,
      pause: 0,
      x: sx,
      y: sy,
      hx: dx / len,
      hy: dy / len,
      bx: 0,
      by: 0,
      alpha: 0,
      dying: false,
      lng: 0,
      lat: 0,
      heading: 0,
      frame: 0,
      saleId,
      released: false,
      stage: 'approach',
      t: 0,
      stageS: CU.maxWalkSeconds,
      glyph: this.rand() < 0.5 ? 'can' : 'coin',
      bubble: null,
      bubbleAlpha: 0,
      mx,
      my,
      standX,
      standY,
      exitX: ex,
      exitY: ey,
    };
    this.finishPose(c);
    this.customers.push(c);
    return true;
  }

  /** Sales whose customer bent to the tray since the last call. */
  takeArrivals(): string[] {
    const out = this.arrivals;
    this.arrivals = [];
    return out;
  }

  /**
   * Street life stops (zoomed out, screen left): every sale not yet taken
   * from the tray is released now, and everyone at the machines goes.
   */
  flushCustomers(): string[] {
    const out = this.takeArrivals();
    for (const c of this.customers) if (c.saleId !== null && !c.released) out.push(c.saleId);
    this.customers.length = 0;
    return out;
  }

  private enter(c: Customer, stage: VisitStage) {
    c.stage = stage;
    c.t = 0;
    const browsing = c.saleId === null;
    switch (stage) {
      case 'look':
        c.stageS = browsing
          ? this.uniform(BR.lookSeconds[0], BR.lookSeconds[1])
          : this.uniform(VI.lookSeconds[0], VI.lookSeconds[1]);
        break;
      case 'think':
        c.stageS = browsing
          ? this.uniform(BR.thinkSeconds[0], BR.thinkSeconds[1])
          : this.uniform(VI.thinkSeconds[0], VI.thinkSeconds[1]);
        break;
      case 'bend':
        c.stageS = VI.bendSeconds;
        // The item is taken now: the sale shows (receipt, coins).
        if (c.saleId !== null && !c.released) {
          c.released = true;
          this.arrivals.push(c.saleId);
        }
        break;
      case 'stand':
        c.stageS = VI.standSeconds;
        break;
      case 'leave':
        c.stageS = VI.leaveWalkSeconds;
        break;
      default:
        c.stageS = CU.maxWalkSeconds;
    }
    // The pose shows from this step on (the stage's own step sets it after).
    c.frame =
      stage === 'think'
        ? LIFE_POSES.ponder
        : stage === 'bend'
          ? LIFE_POSES.crouch
          : stage === 'leave'
            ? c.frame
            : LIFE_POSES.stand;
    if (stage !== 'think') {
      c.bubble = null;
      c.bubbleAlpha = 0;
    }
  }

  private stepCustomers(dt: number) {
    const fade = dt / MAP_LIFE.fadeSeconds;
    let w = 0;
    for (let i = 0; i < this.customers.length; i++) {
      const c = this.customers[i];
      c.t += dt;
      if (c.dying) c.alpha = Math.max(0, c.alpha - fade);
      else c.alpha = Math.min(1, c.alpha + fade);
      switch (c.stage) {
        case 'approach': {
          const arrived = this.walkTo(c, c.standX, c.standY, dt);
          if (arrived || c.t > c.stageS) {
            if (!arrived) {
              // Took too long (a stall): step to the machine.
              c.x = c.standX;
              c.y = c.standY;
            }
            // Stop and face the machine.
            const dx = c.mx - c.x;
            const dy = c.my - c.y;
            const d = Math.hypot(dx, dy) || 1;
            c.hx = dx / d;
            c.hy = dy / d;
            this.enter(c, 'look');
          }
          break;
        }
        case 'look':
          // Lean in to the glass and back.
          c.frame = Math.floor(c.t / VI.swaySeconds) % 2 === 1 ? LIFE_POSES.lean : LIFE_POSES.stand;
          if (c.t >= c.stageS) this.enter(c, 'think');
          break;
        case 'think': {
          c.frame = LIFE_POSES.ponder;
          const decided = c.saleId !== null && c.t >= c.stageS * VI.dotsShare;
          c.bubble = decided ? c.glyph : 'dots';
          c.bubbleAlpha = Math.min(1, c.t / VI.bubbleFadeSeconds);
          if (c.t >= c.stageS) this.enter(c, c.saleId === null ? 'leave' : 'bend');
          break;
        }
        case 'bend':
          c.frame = LIFE_POSES.crouch;
          if (c.t >= c.stageS) this.enter(c, 'stand');
          break;
        case 'stand':
          c.frame = LIFE_POSES.stand;
          if (c.t >= c.stageS) this.enter(c, 'leave');
          break;
        default: {
          // Turn and walk off; fade out after a few steps.
          const there = this.walkTo(c, c.exitX, c.exitY, dt);
          if (there) c.frame = LIFE_POSES.stand;
          if (there || c.t > c.stageS) c.dying = true;
        }
      }
      this.finishPose(c);
      if (c.dying && c.alpha <= 0) continue;
      this.customers[w++] = c;
    }
    this.customers.length = w;
  }

  /** Now and then a window shopper walks up to a machine in view. */
  private stepBrowsers(dt: number) {
    const ms = this.local;
    if (!ms.length) return;
    let browsing = 0;
    for (const c of this.customers) if (c.saleId === null) browsing++;
    if (browsing >= BR.max) return;
    let seen = 0;
    for (const m of ms) if (this.inView(m.x, m.y)) seen++;
    if (!seen) return;
    this.browseBudget +=
      ((dt * BR.perMachinePerMinute) / 60) * seen * peopleActivity(this.conditions);
    if (this.browseBudget < this.browseNext) return;
    this.browseBudget -= this.browseNext;
    // Exponential-ish spacing: the next one costs 0.3..1.7 visits.
    this.browseNext = this.uniform(0.3, 1.7);
    for (let tries = 0; tries < 6; tries++) {
      const lm = ms[Math.floor(this.rand() * ms.length)];
      if (!this.inView(lm.x, lm.y) || this.busyMachine(lm.x, lm.y)) continue;
      this.visit(null, lm.m.lng, lm.m.lat, lm.m.heading);
      return;
    }
  }

  /** Someone already at (or walking to) the machine at local (x, y)? */
  private busyMachine(x: number, y: number): boolean {
    for (const c of this.customers)
      if (!c.dying && Math.abs(c.mx - x) < 0.5 && Math.abs(c.my - y) < 0.5) return true;
    return false;
  }

  /** Walk straight toward (x, y); true once there. */
  private walkTo(c: Customer, x: number, y: number, dt: number): boolean {
    const dx = x - c.x;
    const dy = y - c.y;
    const d = Math.hypot(dx, dy);
    const ds = c.speed * dt;
    if (d <= ds) {
      c.x = x;
      c.y = y;
      return true;
    }
    c.x += (dx / d) * ds;
    c.y += (dy / d) * ds;
    c.phase += ds;
    c.frame = WALK_CYCLE[Math.floor(c.phase / P.strideM) % 4];
    this.turnToward(c, dx, dy, dx / d, dy / d, 500 * dt, dt);
    return false;
  }

  // ------------------------------------------------------------- shared

  /**
   * At the end of a road piece, continue on a road passing near the end
   * point: the next tile piece of the same street (straight on), or a cross
   * street (turn). Never a U-turn.
   */
  private transfer(a: Person): boolean {
    const net = this.net!;
    const road = net.roads[a.road];
    const endS = a.dir > 0 ? road.length : 0;
    const over = a.dir > 0 ? a.s - road.length : -a.s;
    net.pointAt(road, endS, this.v1);
    const ex = this.v1.x;
    const ey = this.v1.y;
    net.tangentAt(road, endS, 4, this.v2);
    const tx = this.v2.x * a.dir;
    const ty = this.v2.y * a.dir;
    const hits = net.near(ex, ey, MAP_LIFE.connectRadiusM, this.hits);
    const cands = this.cands;
    cands.length = 0;
    for (const h of hits) {
      if (h.road === a.road) continue;
      const r = net.roads[h.road];
      // Continue from where the person actually is (their sidewalk), so
      // turning a corner stays on the same side of the block.
      const s = net.project(h.road, a.x, a.y, this.proj).s;
      for (const dir of [1, -1] as const) {
        const remaining = dir > 0 ? r.length - s : s;
        if (remaining < 10) continue;
        net.tangentAt(r, s + 3 * dir, 4, this.v2);
        const align = (this.v2.x * tx + this.v2.y * ty) * dir;
        if (align < -0.3) continue;
        cands.push({ road: h.road, s, dir, align, d: h.d });
      }
    }
    // Try the picks in turn until one leads onto open sidewalk.
    while (cands.length) {
      const straight = cands.filter((c) => c.align > 0.8);
      const turns = cands.filter((c) => c.align <= 0.8);
      // The closest aligned piece (tile splits overlap exactly), or a turn.
      const pick =
        straight.length && (!turns.length || this.rand() >= 0.5)
          ? straight.reduce((b, c) => (c.d - c.align * 2 < b.d - b.align * 2 ? c : b))
          : turns[Math.floor(this.rand() * turns.length)];
      cands.splice(cands.indexOf(pick), 1);
      const r = net.roads[pick.road];
      const room = pick.dir > 0 ? r.length - pick.s : pick.s;
      const s = pick.s + pick.dir * Math.min(Math.max(0, over), room - 1);
      const [lo, hi] = P.sidewalkOffsetM[r.kind];
      const offset = this.uniform(lo, hi);
      // Stay on the same corner: pick the sidewalk nearest to where we are.
      net.pointAt(r, s, this.v1);
      net.tangentAt(r, s, PED_SPAN, this.v2);
      const rx = this.v1.x + this.v2.y * offset;
      const ry = this.v1.y - this.v2.x * offset;
      const lx = this.v1.x - this.v2.y * offset;
      const ly = this.v1.y + this.v2.x * offset;
      const side: 1 | -1 =
        (rx - a.x) ** 2 + (ry - a.y) ** 2 <= (lx - a.x) ** 2 + (ly - a.y) ** 2 ? 1 : -1;
      // Never onto water / alongside asphalt (a bridge's approach, a quay).
      if (
        this.lineBlocked(pick.road, side, s) ||
        this.lineBlocked(pick.road, side, s + pick.dir * SAMPLE_M)
      )
        continue;
      const prevX = a.x;
      const prevY = a.y;
      a.road = pick.road;
      a.dir = pick.dir;
      a.s = s;
      a.offset = offset;
      a.side = side;
      this.personTarget(a, net);
      a.bx = prevX - this.v1.x;
      a.by = prevY - this.v1.y;
      return true;
    }
    return false;
  }

  /**
   * Rotate the displayed heading toward the direction of motion (or the path
   * tangent when barely moving), at most `maxDeg` this step.
   */
  private turnToward(
    a: Person,
    mx: number,
    my: number,
    tx: number,
    ty: number,
    maxDeg: number,
    dt: number,
  ) {
    let gx = tx;
    let gy = ty;
    const m = Math.hypot(mx, my);
    if (dt > 0 && m > 0.02) {
      gx = mx / m;
      gy = my / m;
    }
    if (dt <= 0) {
      a.hx = gx;
      a.hy = gy;
      return;
    }
    const cur = Math.atan2(a.hx, a.hy);
    const want = Math.atan2(gx, gy);
    let d = want - cur;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const lim = maxDeg * DEG;
    const next = cur + Math.max(-lim, Math.min(lim, d));
    a.hx = Math.sin(next);
    a.hy = Math.cos(next);
  }

  private finishPose(a: Person) {
    this.net!.toLngLatInto(a.x, a.y, a);
    const h = Math.atan2(a.hx, a.hy) / DEG;
    a.heading = h < 0 ? h + 360 : h;
  }

  // --------------------------------------------------------------- step

  /** Advance `dt` seconds (clamped to 0.25 s so a stall doesn't teleport). */
  step(dtIn: number): void {
    if (!this.net) return;
    const dt = Math.min(0.25, Math.max(0, dtIn));
    if (dt <= 0) return;
    this.stepPeople(dt);
    this.stepCustomers(dt);
    this.stepBrowsers(dt);
    this.cull(this.people);
    this.balance(dt);
  }

  /** Remove faded-out and far off-screen agents (in place). */
  private cull(list: Person[]) {
    const pad = MAP_LIFE.viewPaddingM;
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if ((a.dying && a.alpha <= 0) || !this.inView(a.x, a.y, pad)) continue;
      list[w++] = a;
    }
    list.length = w;
  }

  /** Spawn toward the target, retire the surplus (furthest first). */
  private balance(dt: number) {
    let alive = 0;
    for (const p of this.people) if (!p.dying) alive++;
    const deficit = this.targetPeople - alive;
    if (deficit > 0) {
      this.budget += dt * Math.max(3, this.targetPeople * 0.3);
      let n = Math.min(deficit, Math.floor(this.budget));
      this.budget -= n;
      while (n-- > 0) {
        const edge = this.rand() < MAP_LIFE.edgeSpawnShare;
        if (!this.spawnPerson(edge) && !(edge && this.spawnPerson(false))) break;
      }
      return;
    }
    this.budget = 0;
    let surplus = -deficit;
    if (surplus <= 1) return;
    // Retire the ones furthest from the center.
    while (surplus-- > 0) {
      let far: Person | null = null;
      let farD = -1;
      for (const p of this.people) {
        if (p.dying) continue;
        const d = (p.x - this.cx) ** 2 + (p.y - this.cy) ** 2;
        if (d > farD) {
          farD = d;
          far = p;
        }
      }
      if (!far) break;
      far.dying = true;
    }
  }
}
