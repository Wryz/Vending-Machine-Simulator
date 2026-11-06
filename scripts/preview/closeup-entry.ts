/**
 * Browser entry for the 3D close-up preview: the GLB machine on a sidewalk in
 * front of a facade, lit by `sceneLighting` for the real New York sun.
 */
import {
  CLOSEUP_CAMERA,
  FAMILY_ACCENT,
  getMachineType,
  SNACK_MACHINE_DIMENSIONS,
} from '@/config/machines';
import { bearingToVector, closeupCamera, headingToRotationY } from '@/map/cameraMatch';
import { getTimeOfDay } from '@/map/timeOfDay';
import { countSceneTriangles } from '@/three/life/geometry';
import { CARS, PEDESTRIANS } from '@/config/streetLife';
import { streetLayout } from '@/three/life/layout';
import { carsAt, emptyCar } from '@/three/life/traffic';
import { createStreetScene } from '@/three/life/streetScene';
import { activeWalkerCount, emptyWalker, walkerAt } from '@/three/life/walkers';
import { sceneLighting } from '@/three/lightingRig';
import { createMachineFx, createMachineMirror, trimShadowCasters } from '@/three/machineFx';
import {
  countTriangles,
  createVendingMachine,
  setMachineGlow,
} from '@/three/models/vendingMachine';

import {
  addLights,
  b64ToBuf,
  bloom,
  canvasToB64,
  contactShadow,
  downsample,
  loadGLB,
  rendererFor,
  setGlow,
  THREE,
} from '../sprites/scene';

export { nyDate, pickDate } from './map-entry';

export async function renderCloseup(opts: {
  glb: string;
  dateIso: string;
  lat: number;
  lng: number;
  width: number;
  height: number;
  supersample: number;
}) {
  const tod = getTimeOfDay(new Date(opts.dateIso), opts.lat, opts.lng);
  const l = sceneLighting(tod.sun, tod.palette);
  const m = await loadGLB(b64ToBuf(opts.glb));
  const size = m.box.getSize(new THREE.Vector3());
  setGlow(m, l.machineGlow);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(l.skyColor);
  scene.fog = new THREE.Fog(l.skyColor, 9, 26);
  scene.add(m.group);
  // Machine faces south (+z), base on the sidewalk, back ~25 cm off a facade.
  const back = -size.z / 2 - 0.25;

  const std = (color: string, roughness = 0.9) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: true });
  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(30, 0.15, 4.2), std('#BDB9B1'));
  sidewalk.position.set(0, -0.075, back + 2.1);
  sidewalk.receiveShadow = true;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), std(tod.palette.road, 0.95));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.15, back + 4.2 + 10);
  road.receiveShadow = true;
  const facade = new THREE.Mesh(new THREE.BoxGeometry(30, 9, 0.4), std(tod.palette.building, 0.85));
  facade.position.set(0, 4.5, back - 0.2);
  facade.receiveShadow = true;
  facade.castShadow = true;
  // A couple of window recesses so the facade reads as a building.
  const windowMat = std('#5E6670', 0.3);
  for (const x of [-3.2, 3.2]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.05), windowMat);
    w.position.set(x, 1.6, back + 0.01);
    w.receiveShadow = true;
    scene.add(w);
  }
  scene.add(sidewalk, road, facade, contactShadow(size.x, size.z, 0.35));

  const rig = addLights(scene, l, {
    shadow: true,
    glowAt: new THREE.Vector3(0, size.y * 0.6, size.z / 2 + 0.7),
  });
  void rig;

  // 3/4 establishing view (from the south-southeast) so the sun shadow and
  // ground read; CLOSEUP_CAMERA itself frames only the glass in portrait.
  const [fx, fz] = bearingToVector(155);
  const dist = 4.6;
  const camera = new THREE.PerspectiveCamera(
    CLOSEUP_CAMERA.fovDeg,
    opts.width / opts.height,
    0.1,
    100,
  );
  camera.position.set(fx * dist, CLOSEUP_CAMERA.eyeHeightM, fz * dist);
  camera.lookAt(0, size.y * 0.5, 0);

  const ss = opts.supersample;
  const renderer = rendererFor(undefined, opts.width * ss, opts.height * ss, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.render(scene, camera);
  const small = downsample(renderer.domElement, ss);
  if (l.machineGlow > 0.5) bloom(small, 0.7, 6 * (opts.width / 390), 0.45 * l.machineGlow);
  renderer.dispose();
  return {
    rgba: canvasToB64(small),
    preset: tod.dominant,
    sun: tod.sun,
    lighting: l,
  };
}

// ---------------------------------------------------------------------------
// Street life close-up: the procedural machine as the app builds it, with
// pedestrians, cars, the street set and the shop-window reflection, framed by
// the app's own close-up camera (optionally orbited) or a wide establishing view.

export interface LifeShot {
  dateIso: string;
  lat: number;
  lng: number;
  width: number;
  height: number;
  supersample: number;
  crowd: number;
  traffic: number;
  /** Seconds on the street-life clock (pick with `pickLifeTime`). */
  tS: number;
  view: 'closeup' | 'wide';
  orbitDeg: number;
  seed: number;
  /** Optional: a sale `saleAgoMs` before the shot (product falling / customer reaching). */
  saleAgoMs?: number;
  /** Optional interaction states, for checking the machine animations. */
  broken?: boolean;
  collectAgoMs?: number;
  restockAgoMs?: number;
  selectedSlot?: number;
}

const HEADING = 180;

/** Find a street-life time with a customer at the machine and someone passing in frame. */
export function pickLifeTime(seed: number, crowd: number, from = 0, to = 900): number {
  const layout = streetLayout(SNACK_MACHINE_DIMENSIONS.depthM);
  const n = activeWalkerCount(crowd);
  const w = emptyWalker();
  const before = emptyWalker();
  let best = from;
  let bestScore = -1;
  for (let t = from; t < to; t += 0.25) {
    let score = 0;
    for (let i = 0; i < n; i++) {
      walkerAt(w, seed, i, t, layout);
      if (!w.active) continue;
      if (w.atMachine && w.stopLeft > 1.5 && w.turn > 0.9) {
        // Bonus if they were already standing there a second ago (a sale can play out).
        walkerAt(before, seed, i, t - 1, layout);
        score += before.atMachine && before.stopLeft > 1.8 ? 4 : 3;
      }
      else if (w.z > layout.walkWestZ - 0.2 && Math.abs(w.x) < 2.6) score -= 3; // right in front of the lens
      else if (Math.abs(w.x) > 0.9 && Math.abs(w.x) < 2.2) score += 2;
      else if (Math.abs(w.x) < 0.9) score -= 2; // would hide the machine
      else if (Math.abs(w.x) < 7) score += 0.5;
    }
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

/** For the wide view: a moment with a car passing in front and people on the sidewalk. */
export function pickWideTime(seed: number, crowd: number, traffic: number, around: number): number {
  const layout = streetLayout(SNACK_MACHINE_DIMENSIONS.depthM);
  const cars = Array.from({ length: CARS.capacity }, emptyCar);
  const n = activeWalkerCount(crowd);
  const w = emptyWalker();
  let best = around;
  let bestScore = -1;
  for (let t = around - 40; t < around + 40; t += 0.2) {
    let score = 0;
    const k = carsAt(cars, seed, t, traffic, layout, false);
    for (let i = 0; i < k; i++) if (Math.abs(cars[i].x - 2) < 4) score += cars[i].lane === 1 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      walkerAt(w, seed, i, t, layout);
      if (w.active && Math.abs(w.x) < 6) score += w.atMachine ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

export function renderCloseupLife(o: LifeShot) {
  const tod = getTimeOfDay(new Date(o.dateIso), o.lat, o.lng);
  const l = sceneLighting(tod.sun, tod.palette);
  const type = getMachineType('snack');
  const model = createVendingMachine({
    accent: FAMILY_ACCENT.snacks,
    dims: type.dims,
    rows: type.grid.rows,
    cols: type.grid.cols,
  });
  setMachineGlow(model, l.machineGlow);
  trimShadowCasters(model);
  const mirror = createMachineMirror(model);
  const fx = createMachineFx(model);
  model.group.add(fx.group);
  const night = Math.min(1, Math.max(0, (l.machineGlow - 0.05) / 0.95));
  const life = createStreetScene({ dims: type.dims, seed: o.seed, reflect: [mirror.group] });
  life.setPalette(tod.palette, night);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(l.skyColor);
  const world = new THREE.Group();
  world.rotation.y = headingToRotationY(HEADING);
  world.add(model.group, life.root);
  scene.add(world);
  addLights(scene, l, {
    shadow: true,
    glowAt: new THREE.Vector3(0, 1.15, 0),
  });

  const params = { crowd: o.crowd, traffic: o.traffic, night };
  const nowMs = o.tS * 1000;
  if (o.saleAgoMs !== undefined) {
    // Replay the sale a little before the shot so the customer is mid-reach.
    life.update(o.tS - o.saleAgoMs / 1000, params);
    const color = fx.sale(13, nowMs - o.saleAgoMs);
    if (color) life.offerProduct(color, o.tS - o.saleAgoMs / 1000);
  }
  if (o.broken) fx.setBroken(true);
  if (o.selectedSlot !== undefined) fx.setSelected(o.selectedSlot);
  if (o.collectAgoMs !== undefined) fx.collect(nowMs - o.collectAgoMs);
  if (o.restockAgoMs !== undefined)
    fx.restock(Array.from({ length: 30 }, (_, i) => i), nowMs - o.restockAgoMs);
  life.update(o.tS, params);
  fx.update(nowMs, l.machineGlow);
  mirror.sync();

  const cam = new THREE.PerspectiveCamera(CLOSEUP_CAMERA.fovDeg, o.width / o.height, 0.1, 400);
  if (o.view === 'closeup') {
    const c = closeupCamera(HEADING, type.dims.heightM, CLOSEUP_CAMERA);
    const r = (o.orbitDeg * Math.PI) / 180;
    const [x, , z] = c.position;
    cam.position.set(x * Math.cos(r) + z * Math.sin(r), c.position[1], -x * Math.sin(r) + z * Math.cos(r));
    cam.lookAt(...c.target);
  } else {
    // From across the road, a little above eye level: people, machine and traffic.
    const r = (o.orbitDeg * Math.PI) / 180;
    cam.fov = 38;
    cam.position.set(Math.sin(r) * 16, 6.5, Math.cos(r) * 16);
    cam.lookAt(0, 0.9, 2.6);
  }
  cam.updateProjectionMatrix();

  const ss = o.supersample;
  const renderer = rendererFor(undefined, o.width * ss, o.height * ss, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.render(scene, cam);
  const info = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  const small = downsample(renderer.domElement, ss);
  if (l.machineGlow > 0.5) bloom(small, 0.7, 6 * (o.width / 390), 0.45 * l.machineGlow);
  renderer.dispose();
  const stats = life.stats();
  return {
    rgba: canvasToB64(small),
    preset: tod.dominant,
    sun: tod.sun,
    night,
    stats: {
      ...stats,
      machineTriangles: countTriangles(model.group),
      sceneTriangles: countSceneTriangles(scene),
      drawn: info,
    },
  };
}

/**
 * Worst-case triangles for the close-up (SPEC §7.4 budget ~30K): every
 * static mesh, plus the full crowd and the heaviest cars at capacity, each
 * drawn twice (street + shop-window reflection). Shadow pass not included.
 */
export function budgetReport(typeId: 'snack' | 'combo' = 'combo') {
  const type = getMachineType(typeId);
  const model = createVendingMachine({
    accent: FAMILY_ACCENT.snacks,
    dims: type.dims,
    rows: type.grid.rows,
    cols: type.grid.cols,
  });
  const mirror = createMachineMirror(model);
  const fx = createMachineFx(model);
  model.group.add(fx.group);
  const life = createStreetScene({ dims: type.dims, seed: 1, reflect: [mirror.group] });
  const tri = (g: THREE.BufferGeometry) =>
    (g.index ? g.index.count : (g.attributes.position?.count ?? 0)) / 3;
  let staticTris = 0;
  let personTris = 0;
  const carTris = [0, 0, 0];
  let wheelTris = 0;
  let beamTris = 0;
  const per: Record<string, number> = {};
  const visit = (root: THREE.Object3D) =>
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const t = tri(o.geometry);
      if (o instanceof THREE.InstancedMesh) {
        const n = o.name;
        if (n.endsWith('-mirror')) return; // reflections counted ×2 below
        if (n.startsWith('people-')) {
          const k = n === 'people-limbs' ? 6 : n === 'people-shoes' ? 2 : 1;
          personTris += t * k;
          per[n] = t * k;
        } else if (n.startsWith('car-wheels')) wheelTris = t * 4;
        else if (n.startsWith('car-beams')) beamTris = t;
        else if (n.startsWith('car-')) carTris[Number(n.slice(-1))] += t;
        return;
      }
      if (o.name === 'falling-product') return;
      staticTris += t;
    });
  visit(model.group);
  visit(life.root);
  const perCar = Math.max(...carTris) + wheelTris + beamTris;
  const crowd = personTris * PEDESTRIANS.max;
  const cars = perCar * 4;
  return {
    machine: countTriangles(model.group),
    staticTris,
    perPerson: personTris,
    perPart: per,
    perCar,
    carKinds: carTris.map((t) => t + wheelTris),
    crowd: crowd * 2,
    cars: cars * 2,
    total: staticTris + crowd * 2 + cars * 2,
  };
}
