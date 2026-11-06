import * as THREE from 'three';

import { CARS } from '@/config/streetLife';

import {
  boxPart,
  dynamicInstances,
  maskTexture,
  mergeParts,
  mirrorInstances,
  profilePart,
  type Part,
} from './geometry';
import { pick } from './random';
import type { CarState } from './traffic';

/**
 * Low-poly cars (SPEC §3.3): sedan, hatchback and van silhouettes, ~180–260
 * triangles each, muted paint. Instanced per kind; wheels turn with distance;
 * at night headlights and tail lights glow and a cheap additive beam lies on
 * the road (no extra lights, no shadows from them).
 */

/** Real streets skew to white, silver and gray; a few muted colors. */
const PAINT = [
  '#E6E4DF',
  '#A6A9AD',
  '#7A8088',
  '#2F3238',
  '#D9D8D4',
  '#3D4A5C',
  '#6B2F2F',
  '#8C7A66',
  '#1F2124',
  '#5D6F7F',
  '#C4C6C8',
  '#4F5B4C',
];
const VAN_PAINT = ['#E6E4DF', '#D9D8D4', '#A6A9AD', '#2F3238', '#3D4A5C'];

const SIDES = [-1, 1] as const;
const TRIM = '#2A2C2F';

interface KindSpec {
  length: number;
  width: number;
  wheelX: [number, number];
  track: number;
  parts: Part[];
  head: [number, number];
  tail: [number, number];
  glass: Part[];
}

function kinds(): KindSpec[] {
  const sedan: KindSpec = {
    length: 4.6,
    width: 1.8,
    wheelX: [1.42, -1.36],
    track: 0.78,
    head: [0.62, 0.6],
    tail: [0.72, 0.64],
    parts: [
      profilePart(
        [
          [-2.3, 0.3],
          [2.3, 0.3],
          [2.32, 0.6],
          [2.2, 0.78],
          [1.05, 0.88],
          [-1.45, 0.92],
          [-2.22, 0.86],
          [-2.32, 0.62],
        ],
        1.8,
      ),
      boxPart(1.2, 0.05, 1.5, -0.39, 1.385, 0),
      boxPart(4.7, 0.16, 1.84, 0, 0.36, 0, TRIM),
    ],
    glass: [
      profilePart(
        [
          [1.05, 0.879],
          [0.2, 1.36],
          [-0.98, 1.38],
          [-1.5, 0.919],
        ],
        1.6,
      ),
    ],
  };
  const hatch: KindSpec = {
    length: 4.05,
    width: 1.76,
    wheelX: [1.28, -1.24],
    track: 0.77,
    head: [0.62, 0.58],
    tail: [0.8, 0.62],
    parts: [
      profilePart(
        [
          [-2.0, 0.3],
          [2.02, 0.3],
          [2.05, 0.6],
          [1.9, 0.78],
          [0.95, 0.9],
          [-1.9, 0.95],
          [-2.02, 0.84],
          [-2.04, 0.6],
        ],
        1.76,
      ),
      boxPart(1.72, 0.05, 1.48, -0.76, 1.44, 0),
      boxPart(4.12, 0.16, 1.8, 0, 0.36, 0, TRIM),
    ],
    glass: [
      profilePart(
        [
          [0.95, 0.899],
          [0.08, 1.4],
          [-1.62, 1.43],
          [-1.95, 0.949],
        ],
        1.58,
      ),
    ],
  };
  const van: KindSpec = {
    length: 4.95,
    width: 1.95,
    wheelX: [1.62, -1.55],
    track: 0.86,
    head: [0.72, 0.66],
    tail: [0.85, 0.7],
    parts: [
      profilePart(
        [
          [-2.45, 0.32],
          [2.45, 0.32],
          [2.48, 0.7],
          [2.3, 0.96],
          [1.62, 1.12],
          [1.02, 1.94],
          [-2.4, 1.98],
          [-2.48, 1.84],
          [-2.48, 0.7],
        ],
        1.95,
      ),
      boxPart(5.02, 0.18, 1.99, 0, 0.38, 0, TRIM),
    ],
    glass: [
      profilePart(
        [
          [1.66, 1.13],
          [1.07, 1.92],
          [0.98, 1.9],
          [1.56, 1.11],
        ],
        1.8,
      ),
      boxPart(0.62, 0.52, 1.97, 1.2, 1.45, 0),
    ],
  };
  return [sedan, hatch, van];
}

function lightsGeometry(k: KindSpec): THREE.BufferGeometry {
  const parts: Part[] = [];
  const quad = (x: number, y: number, z: number, ry: number, color: string, w: number) => {
    const geo = new THREE.PlaneGeometry(w, 0.1);
    const mm = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);
    parts.push({ geo, matrix: mm, color });
  };
  const front = k.length / 2 + 0.035;
  for (const sz of [-1, 1]) {
    quad(front, k.head[0], sz * k.head[1], Math.PI / 2, '#FFF1D8', 0.24);
    quad(-front, k.tail[0], sz * k.tail[1], -Math.PI / 2, '#E0281E', 0.2);
  }
  return mergeParts(parts, true);
}

export interface CarFleet {
  group: THREE.Group;
  mirror: THREE.Group;
  /** Place `n` cars; `night` 0..1 drives the lights. Returns cars drawn. */
  update(cars: readonly CarState[], n: number, night: number): number;
  dispose(): void;
}

export function createCars(roadY: number, capacity = CARS.capacity): CarFleet {
  const specs = kinds();
  const R = CARS.wheelRadiusM;
  const shellMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.42,
    metalness: 0.25,
    flatShading: true,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#4A5662',
    roughness: 0.18,
    metalness: 0.2,
    flatShading: true,
  });
  const lightMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: '#1E1F21',
    roughness: 0.8,
    flatShading: true,
  });
  const beamMat = new THREE.MeshBasicMaterial({
    color: '#FFE3B0',
    alphaMap: maskTexture('beam'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const shells = specs.map((k, i) => {
    const m = dynamicInstances(mergeParts(k.parts, true), shellMat, capacity, `car-shell-${i}`);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  });
  // Glass and lights draw at the shell's instance transforms (shared buffer, no paint tint).
  const glass = specs.map((k, i) => {
    const m = dynamicInstances(mergeParts(k.glass), glassMat, capacity, `car-glass-${i}`);
    m.instanceMatrix = shells[i].instanceMatrix;
    m.castShadow = true;
    return m;
  });
  const lights = specs.map((k, i) => {
    const m = dynamicInstances(lightsGeometry(k), lightMat, capacity, `car-lights-${i}`);
    m.instanceMatrix = shells[i].instanceMatrix;
    return m;
  });
  const wheelGeo = new THREE.CylinderGeometry(R, R, 0.22, 8, 1).rotateX(Math.PI / 2);
  const wheels = dynamicInstances(wheelGeo, wheelMat, capacity * 4, 'car-wheels');
  wheels.castShadow = true;
  const beamGeo = new THREE.PlaneGeometry(7, 2.6).rotateX(-Math.PI / 2).translate(3.5, 0, 0);
  const beams = dynamicInstances(beamGeo, beamMat, capacity, 'car-beams');
  beams.renderOrder = 1;

  const white = new THREE.Color('#ffffff');
  for (const s of shells) for (let i = 0; i < capacity; i++) s.setColorAt(i, white);
  const all = [...shells, ...glass, ...lights, wheels, beams];

  const group = new THREE.Group();
  group.name = 'cars';
  group.add(...all);
  const mirror = new THREE.Group();
  mirror.name = 'cars-mirror';
  const mirrors = all.map(mirrorInstances);
  mirror.add(...mirrors);

  const paint = new THREE.Color();
  const root = new THREE.Matrix4();
  const m = new THREE.Matrix4();
  const rot = new THREE.Matrix4();
  const counts = [0, 0, 0];
  const dayLight = new THREE.Color('#6E6C68');
  const nightLight = new THREE.Color('#ffffff');

  function update(cars: readonly CarState[], n: number, night: number): number {
    counts[0] = counts[1] = counts[2] = 0;
    let w = 0;
    let drawn = 0;
    for (let c = 0; c < Math.min(n, capacity); c++) {
      const car = cars[c];
      const k = specs[car.kind];
      const idx = counts[car.kind]++;
      root.makeRotationY(car.dir > 0 ? 0 : Math.PI).setPosition(car.x, roadY, car.z);
      shells[car.kind].setMatrixAt(idx, root);
      paint.set(pick(car.kind === 2 ? VAN_PAINT : PAINT, car.look));
      shells[car.kind].setColorAt(idx, paint);
      const spin = -car.distance / R;
      for (const wx of k.wheelX)
        for (const side of SIDES) {
          m.makeTranslation(wx, R, side * k.track);
          rot.makeRotationZ(spin);
          wheels.setMatrixAt(w++, m.multiply(rot).premultiply(root));
        }
      m.makeTranslation(k.length / 2 - 0.15, 0.012, 0);
      beams.setMatrixAt(drawn, m.premultiply(root));
      drawn++;
    }
    shells.forEach((s, i) => {
      s.count = counts[i];
      s.instanceMatrix.needsUpdate = true;
      if (s.instanceColor) s.instanceColor.needsUpdate = true;
    });
    for (let i = 0; i < specs.length; i++) glass[i].count = lights[i].count = counts[i];
    wheels.count = w;
    wheels.instanceMatrix.needsUpdate = true;
    beams.count = night > 0.05 ? drawn : 0;
    beams.instanceMatrix.needsUpdate = true;
    beamMat.opacity = 0.32 * night;
    lightMat.color.copy(dayLight).lerp(nightLight, night);
    mirrors.forEach((mm, j) => (mm.count = all[j].count));
    return drawn;
  }

  return {
    group,
    mirror,
    update,
    dispose() {
      for (const o of all) o.geometry.dispose();
      shellMat.dispose();
      glassMat.dispose();
      lightMat.dispose();
      wheelMat.dispose();
      beamMat.alphaMap?.dispose();
      beamMat.dispose();
    },
  };
}
