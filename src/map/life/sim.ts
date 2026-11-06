import { LIFE_CAR_MODELS, LIFE_CAR_WEIGHTS, LIFE_PEOPLE_MODELS, MAP_LIFE } from '@/config/mapLife';
import { nextRandom, type RngState } from '@/sim/rng';

import { lifeTargets } from './density';
import { RoadNetwork, type Road, type RoadHit } from './network';
import type { Car, LifeConditions, LifeView, Person, RoadInput, RoadKind } from './types';

/**
 * Street-life simulation (pure, deterministic for a seed and a sequence of
 * calls): cars drive in lanes on the rendered roads, people walk the
 * sidewalks. Positions are in local meters (east, north) around the network
 * origin, mirrored to lng/lat for the map each step.
 *
 * Allocation-light: agents are plain objects mutated in place, dead ones are
 * compacted out of the arrays, scratch vectors are reused.
 */

const C = MAP_LIFE.cars;
const P = MAP_LIFE.people;
const kmh = (v: number) => v / 3.6;
const DEG = Math.PI / 180;
/** Walk cycle over 4 steps: left stride, passing, right stride, passing. */
const WALK_CYCLE = [1, 0, 2, 0] as const;
/** Chord half-span for smoothed tangents (cars swing wider than people). */
const CAR_SPAN = 3.5;
const PED_SPAN = 2;
/** Positional smoothing after switching roads, seconds. */
const CAR_BLEND_TAU = 0.5;
const PED_BLEND_TAU = 0.5;

interface Vec {
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

const PEOPLE_KINDS: ReadonlySet<RoadKind> = new Set(['major', 'minor']);

export class StreetLife {
  readonly cars: Car[] = [];
  readonly people: Person[] = [];
  net: RoadNetwork | null = null;
  targets = { cars: 0, people: 0 };

  private readonly rng: RngState;
  private nextId = 1;
  private view: LifeView | null = null;
  private box = { x0: 0, y0: 0, x1: 0, y1: 0 };
  private cx = 0;
  private cy = 0;
  private radius = 0;
  private conditions: LifeConditions = { hour: 12, restDay: false, footTraffic: 0 };
  private carCum: Float64Array = new Float64Array(0);
  private pedCum: Float64Array = new Float64Array(0);
  private readonly carModelCum: number[] = [];
  private budget = { cars: 0, people: 0 };
  private readonly v1: Vec = { x: 0, y: 0 };
  private readonly v2: Vec = { x: 0, y: 0 };
  private readonly hits: RoadHit[] = [];
  private readonly proj: RoadHit = { road: 0, s: 0, d: 0 };
  private readonly cands: Candidate[] = [];

  constructor(seed = 1) {
    this.rng = { rng: seed | 0 };
    let acc = 0;
    for (const m of LIFE_CAR_MODELS) this.carModelCum.push((acc += LIFE_CAR_WEIGHTS[m]));
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
   */
  setRoads(roads: readonly RoadInput[], view: LifeView): void {
    const old = this.net;
    const net = new RoadNetwork(roads, view.center);
    this.net = net;
    this.setView(view);
    this.carCum = this.weights(net, (k) => C.perKm[k]);
    this.pedCum = this.weights(net, (k) => (PEOPLE_KINDS.has(k) ? P.perKm[k as 'major'] : 0));
    if (old) {
      for (const c of this.cars) this.reattachCar(c, net);
      for (const p of this.people) this.reattachPerson(p, net);
    }
    // First fill: populate the view at once (each agent fades in).
    if (!this.cars.length) for (let i = 0; i < this.targets.cars; i++) this.spawnCar(false);
    if (!this.people.length) for (let i = 0; i < this.targets.people; i++) this.spawnPerson(false);
  }

  /** Drop everything (e.g. city change). */
  clear(): void {
    this.cars.length = 0;
    this.people.length = 0;
    this.net = null;
  }

  private updateTargets() {
    if (!this.net || !this.view) {
      this.targets = { cars: 0, people: 0 };
      return;
    }
    const lengths = this.net.lengthWithin(this.box, this.cx, this.cy, this.radius);
    this.targets = lifeTargets(this.conditions, lengths);
  }

  private weights(net: RoadNetwork, perKm: (k: RoadKind) => number): Float64Array {
    const cum = new Float64Array(net.roads.length);
    let acc = 0;
    net.roads.forEach((r, i) => (cum[i] = acc += r.length * perKm(r.kind)));
    return cum;
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

  // ---------------------------------------------------------------- cars

  private laneFor(road: Road): number {
    if (road.oneway) {
      const w = C.onewaySpreadM[road.kind];
      return this.uniform(-w, w);
    }
    const [a, b] = C.laneOffsetM[road.kind];
    return this.uniform(a, b);
  }

  private pickCarModel(): number {
    const u = this.rand() * this.carModelCum[this.carModelCum.length - 1];
    const i = this.carModelCum.findIndex((c) => u < c);
    return i < 0 ? 0 : i;
  }

  /** Place a car; `edge` spawns just outside the view, heading in. */
  spawnCar(edge: boolean): boolean {
    const net = this.net;
    if (!net) return false;
    const pad = MAP_LIFE.viewPaddingM;
    for (let tries = 0; tries < 16; tries++) {
      const ri = this.pickRoad(this.carCum);
      if (ri < 0) return false;
      const road = net.roads[ri];
      const s = this.uniform(2, road.length - 2);
      const dir: 1 | -1 = road.oneway ? road.oneway : this.rand() < 0.5 ? 1 : -1;
      const lane = this.laneFor(road);
      net.pointAt(road, s, this.v1);
      net.tangentAt(road, s, CAR_SPAN, this.v2);
      const tx = this.v2.x * dir;
      const ty = this.v2.y * dir;
      const x = this.v1.x + ty * lane;
      const y = this.v1.y - tx * lane;
      if (edge) {
        if (this.inView(x, y) || !this.inView(x, y, pad * 0.8)) continue;
        if (tx * (this.cx - x) + ty * (this.cy - y) <= 0) continue; // must drive inward
      } else if (!this.inView(x, y)) continue;
      if (this.cars.some((c) => (c.x - x) ** 2 + (c.y - y) ** 2 < 81)) continue;
      const [lo, hi] = C.speedKmh[road.kind];
      const cruise = kmh(this.uniform(lo, hi));
      const car: Car = {
        id: this.nextId++,
        model: this.pickCarModel(),
        road: ri,
        s,
        dir,
        lane,
        cruise,
        speed: cruise * 0.8,
        x,
        y,
        hx: tx,
        hy: ty,
        bx: 0,
        by: 0,
        alpha: 0,
        dying: false,
        lng: 0,
        lat: 0,
        heading: 0,
      };
      this.finishPose(car);
      this.cars.push(car);
      return true;
    }
    return false;
  }

  private reattachCar(c: Car, net: RoadNetwork) {
    const [x, y] = net.toLocal(c.lng, c.lat);
    const hits = net.near(x, y, Math.abs(c.lane) + 3, this.hits);
    let best: RoadHit | null = null;
    let bestDir: 1 | -1 = 1;
    let bestScore = -Infinity;
    for (const h of hits) {
      const r = net.roads[h.road];
      net.tangentAt(r, h.s, CAR_SPAN, this.v2);
      const dot = this.v2.x * c.hx + this.v2.y * c.hy;
      if (Math.abs(dot) < 0.85) continue;
      const dir: 1 | -1 = dot > 0 ? 1 : -1;
      if (r.oneway && r.oneway !== dir) continue;
      const score = Math.abs(dot) - Math.abs(h.d - Math.abs(c.lane)) * 0.3;
      if (score > bestScore) {
        bestScore = score;
        best = h;
        bestDir = dir;
      }
    }
    c.x = x;
    c.y = y;
    if (!best) {
      c.road = -1;
      c.dying = true;
      return;
    }
    c.road = best.road;
    c.s = best.s;
    c.dir = bestDir;
    // Keep the car exactly where it was; the new lane eases in.
    this.carTarget(c, net);
    c.bx = x - this.v1.x;
    c.by = y - this.v1.y;
  }

  private stepCars(dt: number) {
    const net = this.net!;
    const fade = dt / MAP_LIFE.fadeSeconds;
    for (const c of this.cars) {
      if (c.dying) c.alpha = Math.max(0, c.alpha - fade);
      else c.alpha = Math.min(1, c.alpha + fade);
      if (c.road < 0) continue;
      const road = net.roads[c.road];

      // Bends ahead: ease off.
      net.tangentAt(road, c.s, CAR_SPAN, this.v1);
      net.tangentAt(road, c.s + 14 * c.dir, CAR_SPAN, this.v2);
      const bend = Math.max(0, this.v1.x * this.v2.x + this.v1.y * this.v2.y);
      let target = c.cruise * (C.bendSlowdown + (1 - C.bendSlowdown) * bend * bend);

      // Car following: nearest car ahead in (roughly) the same lane.
      let gap = Infinity;
      for (const o of this.cars) {
        if (o === c || o.alpha <= 0) continue;
        const dx = o.x - c.x;
        const dy = o.y - c.y;
        const along = dx * c.hx + dy * c.hy;
        if (along <= 0 || along > 25) continue;
        const lateral = Math.abs(dx * c.hy - dy * c.hx);
        if (lateral > 1.6) continue;
        if (o.hx * c.hx + o.hy * c.hy < 0.3) continue;
        if (along < gap) gap = along;
      }
      if (gap < Infinity) target = Math.min(target, Math.max(0, gap - C.followGapM) * 1.1);

      const dv = target - c.speed;
      c.speed += Math.max(-C.brakeMps2 * dt, Math.min(C.accelMps2 * dt, dv));
      if (c.speed < 0) c.speed = 0;
      c.s += c.speed * dt * c.dir;
      if (c.s > road.length || c.s < 0) {
        if (c.dying || !this.transfer(c, true)) {
          c.s = Math.min(road.length, Math.max(0, c.s));
          c.dying = true;
          c.speed *= 0.5;
        }
      }
      this.poseCar(c, net, dt);
    }
  }

  /** Lane position (no smoothing offset) and travel tangent into v1 / v2. */
  private carTarget(c: Car, net: RoadNetwork) {
    const road = net.roads[c.road];
    net.pointAt(road, c.s, this.v1);
    net.tangentAt(road, c.s, CAR_SPAN, this.v2);
    this.v2.x *= c.dir;
    this.v2.y *= c.dir;
    this.v1.x += this.v2.y * c.lane;
    this.v1.y -= this.v2.x * c.lane;
  }

  private poseCar(c: Car, net: RoadNetwork, dt: number) {
    this.carTarget(c, net);
    const decay = Math.exp(-dt / CAR_BLEND_TAU);
    c.bx *= decay;
    c.by *= decay;
    const x = this.v1.x + c.bx;
    const y = this.v1.y + c.by;
    this.turnToward(c, x - c.x, y - c.y, this.v2.x, this.v2.y, C.turnRateDegPerS * dt, dt);
    c.x = x;
    c.y = y;
    this.finishPose(c);
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
      if (!PEOPLE_KINDS.has(r.kind) || Math.abs(h.d - p.offset) > 1.5) continue;
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
        if (p.s > road.length || p.s < 0) {
          if (!this.transfer(p, false)) {
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

  // ------------------------------------------------------------- shared

  /**
   * At the end of a road piece, continue on a road passing near the end
   * point: the next tile piece of the same street (straight on), or a cross
   * street (turn). Never a U-turn; cars respect one-way streets.
   */
  private transfer(a: Car | Person, isCar: boolean): boolean {
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
      if (!isCar && !PEOPLE_KINDS.has(r.kind)) continue;
      // Continue from where the agent actually is (its lane / sidewalk), so
      // turning a corner stays on the same side of the block.
      const s = net.project(h.road, a.x, a.y, this.proj).s;
      for (const dir of [1, -1] as const) {
        if (isCar && r.oneway && r.oneway !== dir) continue;
        const remaining = dir > 0 ? r.length - s : s;
        if (remaining < 10) continue;
        net.tangentAt(r, s + 3 * dir, 4, this.v2);
        const align = (this.v2.x * tx + this.v2.y * ty) * dir;
        if (align < -0.3) continue;
        cands.push({ road: h.road, s, dir, align, d: h.d });
      }
    }
    if (!cands.length) return false;
    let pick: Candidate | null = null;
    const turnChance = isCar ? C.turnChance : 0.5;
    const straight = cands.filter((c) => c.align > 0.8);
    const turns = cands.filter((c) => c.align <= 0.8);
    if (straight.length && (!turns.length || this.rand() >= turnChance)) {
      // The closest aligned piece (tile splits overlap exactly).
      pick = straight.reduce((b, c) => (c.d - c.align * 2 < b.d - b.align * 2 ? c : b));
    } else if (turns.length) {
      pick = turns[Math.floor(this.rand() * turns.length)];
    }
    if (!pick) return false;
    const r = net.roads[pick.road];
    const prevX = a.x;
    const prevY = a.y;
    a.road = pick.road;
    a.dir = pick.dir;
    const room = pick.dir > 0 ? r.length - pick.s : pick.s;
    a.s = pick.s + pick.dir * Math.min(Math.max(0, over), room - 1);
    if (isCar) {
      const c = a as Car;
      if (r.kind !== road.kind || r.oneway !== road.oneway) c.lane = this.laneFor(r);
      const [lo, hi] = C.speedKmh[r.kind];
      c.cruise = kmh(this.uniform(lo, hi));
      this.carTarget(c, net);
      c.bx = prevX - this.v1.x;
      c.by = prevY - this.v1.y;
    } else {
      const p = a as Person;
      const [lo, hi] = P.sidewalkOffsetM[r.kind];
      p.offset = this.uniform(lo, hi);
      // Stay on the same corner: pick the sidewalk nearest to where we are.
      net.pointAt(r, a.s, this.v1);
      net.tangentAt(r, a.s, PED_SPAN, this.v2);
      const rx = this.v1.x + this.v2.y * p.offset;
      const ry = this.v1.y - this.v2.x * p.offset;
      const lx = this.v1.x - this.v2.y * p.offset;
      const ly = this.v1.y + this.v2.x * p.offset;
      p.side = (rx - prevX) ** 2 + (ry - prevY) ** 2 <= (lx - prevX) ** 2 + (ly - prevY) ** 2 ? 1 : -1;
      this.personTarget(p, net);
      p.bx = prevX - this.v1.x;
      p.by = prevY - this.v1.y;
    }
    return true;
  }

  /**
   * Rotate the displayed heading toward the direction of motion (or the path
   * tangent when barely moving), at most `maxDeg` this step.
   */
  private turnToward(
    a: Car | Person,
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

  private finishPose(a: Car | Person) {
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
    this.stepCars(dt);
    this.stepPeople(dt);
    this.cull(this.cars);
    this.cull(this.people);
    this.balance(dt);
  }

  /** Remove faded-out and far off-screen agents (in place). */
  private cull(list: (Car | Person)[]) {
    const pad = MAP_LIFE.viewPaddingM;
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if ((a.dying && a.alpha <= 0) || !this.inView(a.x, a.y, pad)) continue;
      list[w++] = a;
    }
    list.length = w;
  }

  /** Spawn toward the targets, retire the surplus (furthest first). */
  private balance(dt: number) {
    const edgeShare = MAP_LIFE.edgeSpawnShare;
    const kinds = [
      { list: this.cars, target: this.targets.cars, key: 'cars' as const },
      { list: this.people, target: this.targets.people, key: 'people' as const },
    ];
    for (const k of kinds) {
      let alive = 0;
      for (const a of k.list) if (!a.dying) alive++;
      const deficit = k.target - alive;
      if (deficit > 0) {
        this.budget[k.key] += dt * Math.max(3, k.target * 0.3);
        let n = Math.min(deficit, Math.floor(this.budget[k.key]));
        this.budget[k.key] -= n;
        while (n-- > 0) {
          const edge = this.rand() < edgeShare;
          const ok =
            k.key === 'cars'
              ? this.spawnCar(edge) || (edge && this.spawnCar(false))
              : this.spawnPerson(edge) || (edge && this.spawnPerson(false));
          if (!ok) break;
        }
      } else {
        this.budget[k.key] = 0;
        let surplus = -deficit;
        if (surplus <= 1) continue;
        // Retire the ones furthest from the center.
        while (surplus-- > 0) {
          let far: Car | Person | null = null;
          let farD = -1;
          for (const a of k.list) {
            if (a.dying) continue;
            const d = (a.x - this.cx) ** 2 + (a.y - this.cy) ** 2;
            if (d > farD) {
              farD = d;
              far = a;
            }
          }
          if (!far) break;
          far.dying = true;
        }
      }
    }
  }
}
