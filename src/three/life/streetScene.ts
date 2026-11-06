import * as THREE from 'three';

import type { MachineDimensions } from '@/config/machines';
import { CARS, PEDESTRIANS } from '@/config/streetLife';
import type { Palette } from '@/config/timeOfDay';

import { createCars } from './cars';
import { countSceneTriangles } from './geometry';
import { clamp01, smoothstep } from './interactions';
import { streetLayout, type StreetLayout } from './layout';
import { createCrowd } from './people';
import { createStreet } from './street';
import { carsAt, emptyCar, type CarState } from './traffic';
import { activeWalkerCount, emptyWalker, walkerAt, type WalkerState } from './walkers';

/**
 * Street life around the close-up machine (SPEC §3.3, §7.4), as one plain
 * three.js object: the street set, pedestrians, cars and the shop-window
 * reflection. Add `root` under the heading-rotated group next to the machine
 * and call `update` once per frame. Allocation-free per frame.
 */

export interface StreetLifeParams {
  /** 0..1 pedestrians (from real foot traffic at this spot and hour). */
  crowd: number;
  /** 0..1 cars. */
  traffic: number;
  /** 0..1 how dark it is (drives lamps, headlights, lit windows). */
  night: number;
}

export interface StreetScene {
  root: THREE.Group;
  layout: StreetLayout;
  setPalette(palette: Palette, night: number): void;
  /** Advance to `tS` seconds (any monotonic clock). */
  update(tS: number, params: StreetLifeParams): void;
  /**
   * A product just dropped into the bin. If someone stands at the machine
   * long enough, they bend down and walk off with it. Returns true if so.
   */
  offerProduct(color: THREE.Color, tS: number): boolean;
  stats(): { walkers: number; cars: number; triangles: number };
  dispose(): void;
}

export interface StreetSceneOptions {
  dims: MachineDimensions;
  seed: number;
  leftHandTraffic?: boolean;
  /** Extra objects to show in the shop-window reflection (the machine copy). */
  reflect?: THREE.Object3D[];
}

export function createStreetScene(opts: StreetSceneOptions): StreetScene {
  const layout = streetLayout(opts.dims.depthM);
  const street = createStreet(layout, opts.dims.widthM);
  const crowd = createCrowd(PEDESTRIANS.max);
  const fleet = createCars(layout.roadY, CARS.capacity);

  // Carried product: a small box in a customer's right hand.
  const carryMat = new THREE.MeshStandardMaterial({ roughness: 0.55, flatShading: true });
  const carryGeo = new THREE.BoxGeometry(0.075, 0.11, 0.035);
  const carry = new THREE.Mesh(carryGeo, carryMat);
  carry.visible = false;
  carry.castShadow = true;
  const carryMirror = new THREE.Mesh(carryGeo, carryMat);

  const root = new THREE.Group();
  root.name = 'street-life';
  root.add(street.group, crowd.group, fleet.group, carry);

  // Mirror about the shop-window glass plane: z' = 2·glassZ − z.
  const mirror = new THREE.Group();
  mirror.name = 'reflection';
  mirror.position.z = 2 * layout.glassZ;
  mirror.scale.z = -1;
  mirror.add(street.mirror, crowd.mirror, fleet.mirror, carryMirror, ...(opts.reflect ?? []));
  mirror.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });
  root.add(mirror);

  const walkers: WalkerState[] = Array.from({ length: PEDESTRIANS.max }, emptyWalker);
  const enabled: boolean[] = new Array<boolean>(PEDESTRIANS.max).fill(false);
  const reach = new Float32Array(PEDESTRIANS.max);
  const cars: CarState[] = Array.from({ length: CARS.capacity }, emptyCar);
  let first = true;
  let nWalkers = 0;
  let nCars = 0;
  // Pickup in progress.
  const pickup = { walker: -1, trip: 0, t0: 0, holding: false };
  const R = PEDESTRIANS.reach;
  const handPos = new THREE.Vector3();

  function update(tS: number, p: StreetLifeParams) {
    const want = activeWalkerCount(p.crowd);
    for (let i = 0; i < walkers.length; i++) {
      walkerAt(walkers[i], opts.seed, i, tS, layout);
      // Change density only between trips, so nobody pops in or out on screen.
      if (first || !walkers[i].active) enabled[i] = i < want;
      reach[i] = 0;
    }
    first = false;

    // Customer reaching into the bin, then carrying the product away.
    carry.visible = false;
    if (pickup.walker >= 0) {
      const w = walkers[pickup.walker];
      if (!w.active || w.trip !== pickup.trip || !enabled[pickup.walker]) {
        pickup.walker = -1;
      } else {
        const el = tS - pickup.t0 - R.delayS;
        const up = smoothstep(el / R.inS);
        const down = smoothstep((el - R.inS - R.holdS) / R.outS);
        reach[pickup.walker] = w.atMachine ? clamp01(up - down) : 0;
        if (el >= R.inS) pickup.holding = true;
      }
    }

    nWalkers = crowd.update(walkers, enabled, reach);
    if (pickup.walker >= 0 && pickup.holding) {
      crowd.hand(pickup.walker, handPos);
      carry.position.copy(handPos);
      carry.position.y -= 0.03;
      carry.rotation.y = walkers[pickup.walker].yaw;
      carry.visible = true;
    }
    carryMirror.visible = carry.visible;
    carryMirror.position.copy(carry.position);
    carryMirror.rotation.copy(carry.rotation);

    nCars = carsAt(cars, opts.seed, tS, p.traffic, layout, !!opts.leftHandTraffic);
    fleet.update(cars, nCars, p.night);
  }

  return {
    root,
    layout,
    setPalette: street.setLook,
    update,
    offerProduct(color, tS) {
      for (let i = 0; i < walkers.length; i++) {
        const w = walkers[i];
        if (!w.active || !enabled[i] || !w.atMachine || w.stopLeft < R.minStopLeftS) continue;
        pickup.walker = i;
        pickup.trip = w.trip;
        pickup.t0 = tS;
        pickup.holding = false;
        carryMat.color.copy(color);
        return true;
      }
      return false;
    },
    stats: () => ({ walkers: nWalkers, cars: nCars, triangles: countSceneTriangles(root) }),
    dispose() {
      street.dispose();
      crowd.dispose();
      fleet.dispose();
      carryGeo.dispose();
      carryMat.dispose();
    },
  };
}
