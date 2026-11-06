import * as THREE from 'three';

import type { Palette } from '@/config/timeOfDay';
import { STREET_LAYOUT } from '@/config/streetLife';

import { boxPart, mergeParts, type Part } from './geometry';
import type { StreetLayout } from './layout';
import { hash01 } from './random';

/**
 * The street around the close-up machine, in the machine's local frame:
 * facade with two shop windows behind it, sidewalk with paving joints, curb,
 * a two-lane road, a far sidewalk, a street lamp (sodium glow at night), a
 * tree, a bench and a bin. Muted colors from the time-of-day palette (SPEC
 * §3.3: the machine carries the color).
 *
 * The shop windows look like glass because a mirrored copy of the street
 * (and the life on it) sits behind them inside a closed building box: a cheap
 * planar reflection with no render targets. Cars on the road behind the
 * close-up camera show up there.
 */

export interface StreetSet {
  group: THREE.Group;
  /** Mirrored street furniture and floor for the shop-window reflection. */
  mirror: THREE.Group;
  lamp: THREE.PointLight;
  setLook(palette: Palette, night: number): void;
  dispose(): void;
}

const std = (color: string, roughness = 0.9, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: true, ...extra });

const c = (hex: string) => new THREE.Color(hex);

export function createStreet(layout: StreetLayout, machineWidthM: number): StreetSet {
  const S = STREET_LAYOUT;
  const L = S.halfLengthM;
  const F = L + 2;
  const H = S.facadeHeightM;
  const T = 0.3;
  const { wallZ, curbZ, roadY, roadFarZ, glassZ } = layout;
  const W = S.shopWindow;

  const mats = {
    sidewalk: std('#BDB9B1'),
    curb: std('#C9C6BF', 0.8),
    joint: std('#A8A49C', 0.95, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    asphalt: std('#7E8083', 0.95),
    marking: std('#E3DFD3', 0.85, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    land: std('#D8D4CC', 1),
    facade: std('#E2DDD3', 0.92),
    stone: std('#B9B2A6', 0.85),
    frame: std('#2C2F33', 0.45, { metalness: 0.5 }),
    glass: new THREE.MeshStandardMaterial({
      color: '#1A2026',
      roughness: 0.06,
      metalness: 0.1,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      flatShading: true,
    }),
    upperWin: std('#4D555E', 0.25, { metalness: 0.3 }),
    litWin: std('#4D555E', 0.4, { emissive: c('#FFD9A0'), emissiveIntensity: 0 }),
    interior: new THREE.MeshBasicMaterial({ color: '#C8D0D4', side: THREE.BackSide }),
    trunk: std('#5B5048', 0.95),
    leaf: std('#74835F', 0.9),
    grate: std('#57544E', 0.7, { metalness: 0.3 }),
    pole: std('#3A3E42', 0.55, { metalness: 0.5 }),
    lens: std('#E8DCC4', 0.3, { emissive: c('#FFB25E'), emissiveIntensity: 0 }),
    wood: std('#8A6E52', 0.8),
    bin: std('#46504C', 0.6, { metalness: 0.3 }),
  };

  const group = new THREE.Group();
  group.name = 'street';
  const reflected: THREE.Mesh[] = [];
  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    opts: { cast?: boolean; receive?: boolean; reflect?: boolean; name?: string } = {},
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = opts.cast ?? false;
    m.receiveShadow = opts.receive ?? true;
    if (opts.name) m.name = opts.name;
    group.add(m);
    if (opts.reflect) reflected.push(m);
    return m;
  };
  const merged = (parts: Part[]) => mergeParts(parts);

  // Ground: land, road, sidewalks, curbs, paving joints, lane markings.
  add(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2).translate(0, roadY - 0.01, 0), mats.land, {
    name: 'land',
  });
  add(
    new THREE.PlaneGeometry(2 * L, roadFarZ - curbZ)
      .rotateX(-Math.PI / 2)
      .translate(0, roadY, (curbZ + roadFarZ) / 2),
    mats.asphalt,
    { reflect: true, name: 'road' },
  );
  // The strip under the facade is not reflected (its mirror would z-fight in front of the glass).
  add(new THREE.BoxGeometry(2 * L, -roadY, 0.4).translate(0, roadY / 2, wallZ - 0.2), mats.sidewalk, {
    name: 'sidewalk-under-facade',
  });
  add(
    merged([
      boxPart(2 * L, -roadY, curbZ - wallZ, 0, roadY / 2, (wallZ + curbZ) / 2),
      boxPart(2 * L, -roadY, S.farSidewalkM, 0, roadY / 2, roadFarZ + S.farSidewalkM / 2),
    ]),
    mats.sidewalk,
    { reflect: true, name: 'sidewalk' },
  );
  add(
    merged([
      boxPart(2 * L, -roadY + 0.006, 0.16, 0, roadY / 2 + 0.003, curbZ - 0.08),
      boxPart(2 * L, -roadY + 0.006, 0.16, 0, roadY / 2 + 0.003, roadFarZ + 0.08),
    ]),
    mats.curb,
    { reflect: true, name: 'curb' },
  );
  {
    const parts: Part[] = [];
    const depth = curbZ - 0.16 - wallZ;
    for (let x = -L + 0.75; x < L; x += 1.5) {
      parts.push({
        geo: new THREE.PlaneGeometry(0.014, depth).rotateX(-Math.PI / 2),
        matrix: new THREE.Matrix4().makeTranslation(x, 0.001, wallZ + depth / 2),
      });
    }
    parts.push({
      geo: new THREE.PlaneGeometry(2 * L, 0.014).rotateX(-Math.PI / 2),
      matrix: new THREE.Matrix4().makeTranslation(0, 0.001, wallZ + 1.5),
    });
    add(merged(parts), mats.joint, { reflect: true, name: 'paving-joints' });
  }
  {
    const parts: Part[] = [];
    const z = curbZ + S.laneWidthM;
    for (let x = -L + 1.5; x < L - 1.5; x += 8) {
      parts.push({
        geo: new THREE.PlaneGeometry(3, 0.12).rotateX(-Math.PI / 2),
        matrix: new THREE.Matrix4().makeTranslation(x + 1.5, roadY + 0.002, z),
      });
    }
    add(merged(parts), mats.marking, { reflect: true, name: 'lane-markings' });
  }

  // Facade: panels around two shop-window holes, plinth, fascia, cornice.
  {
    const zc = wallZ - T / 2;
    const panel = (x0: number, x1: number, y0: number, y1: number) =>
      boxPart(x1 - x0, y1 - y0, T, (x0 + x1) / 2, (y0 + y1) / 2, zc);
    const parts: Part[] = [
      panel(-F, -W.outerX, 0, H),
      panel(W.outerX, F, 0, H),
      panel(-W.innerX, W.innerX, 0, H),
    ];
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -W.outerX : W.innerX;
      const x1 = s < 0 ? -W.innerX : W.outerX;
      parts.push(panel(x0, x1, W.headY, H), panel(x0, x1, 0, W.sillY));
    }
    add(merged(parts), mats.facade, { cast: true, name: 'facade' });
    add(
      merged([
        boxPart(2 * F, W.sillY, 0.03, 0, W.sillY / 2, wallZ + 0.015),
        boxPart(W.outerX * 2 + 0.4, 0.5, 0.06, 0, 3.1, wallZ + 0.03),
        boxPart(2 * F, 0.14, 0.12, 0, 3.55, wallZ + 0.06),
      ]),
      mats.stone,
      { cast: true, name: 'facade-trim' },
    );
    // Window frames: sill, head, jambs (lining the reveal) and a mullion.
    const f = 0.05;
    const fp: Part[] = [];
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -W.outerX : W.innerX;
      const x1 = s < 0 ? -W.innerX : W.outerX;
      const cx = (x0 + x1) / 2;
      const w = x1 - x0;
      const hh = W.headY - W.sillY;
      fp.push(
        boxPart(w + f, f, T + 0.02, cx, W.sillY + f / 2, zc + 0.01),
        boxPart(w + f, f, T, cx, W.headY - f / 2, zc),
        boxPart(f, hh, T, x0 + f / 2, (W.sillY + W.headY) / 2, zc),
        boxPart(f, hh, T, x1 - f / 2, (W.sillY + W.headY) / 2, zc),
        boxPart(0.04, hh, 0.06, cx, (W.sillY + W.headY) / 2, glassZ + 0.03),
      );
    }
    add(merged(fp), mats.frame, { name: 'window-frames' });
    const gw = W.outerX - W.innerX;
    const gh = W.headY - W.sillY;
    add(
      merged(
        [-1, 1].map((s) => ({
          geo: new THREE.PlaneGeometry(gw, gh),
          matrix: new THREE.Matrix4().makeTranslation(
            (s * (W.innerX + W.outerX)) / 2,
            (W.sillY + W.headY) / 2,
            glassZ,
          ),
        })),
      ),
      mats.glass,
      { receive: false, name: 'shop-glass' },
    ).renderOrder = 2;
    // Upper floors: inset windows, some lit at night.
    const dark: Part[] = [];
    const lit: Part[] = [];
    let i = 0;
    for (const y of [4.2, 6.75]) {
      for (let x = -F + 1.6; x < F - 1.2; x += 2.6) {
        const p = boxPart(1.3, 1.65, 0.04, x, y + 0.82, wallZ + 0.01);
        (hash01(17, i++) < 0.3 ? lit : dark).push(p);
      }
    }
    add(merged(dark), mats.upperWin, { name: 'upper-windows' });
    add(merged(lit), mats.litWin, { name: 'upper-windows-lit' });
    // Closed building box: interior (seen through the glass), roof.
    const depth = S.buildingDepthM;
    add(
      new THREE.BoxGeometry(2 * F - 0.2, H - 0.4, depth - 0.4).translate(
        0,
        (H - 0.4) / 2 - 0.3,
        wallZ - T - (depth - 0.4) / 2,
      ),
      mats.interior,
      { receive: false, name: 'reflection-backdrop' },
    );
    add(
      new THREE.BoxGeometry(2 * F, 0.25, depth).translate(0, H - 0.125, wallZ - depth / 2),
      mats.facade,
      { receive: false, name: 'roof' },
    );
  }

  // Street lamp near the curb, arm over the road.
  const lampZ = curbZ - S.lamp.fromCurbM;
  const LH = S.lamp.heightM;
  {
    const pole = new THREE.CylinderGeometry(0.05, 0.065, LH, 6, 1).translate(S.lamp.x, LH / 2, lampZ);
    const base = new THREE.CylinderGeometry(0.1, 0.12, 0.45, 6, 1).translate(S.lamp.x, 0.225, lampZ);
    add(
      mergeParts([
        { geo: pole },
        { geo: base },
        boxPart(0.06, 0.06, S.lamp.armM, S.lamp.x, LH - 0.08, lampZ + S.lamp.armM / 2),
        boxPart(0.24, 0.1, 0.52, S.lamp.x, LH - 0.16, lampZ + S.lamp.armM),
      ]),
      mats.pole,
      { cast: true, reflect: true, name: 'lamp' },
    );
    add(
      new THREE.BoxGeometry(0.18, 0.02, 0.42).translate(S.lamp.x, LH - 0.22, lampZ + S.lamp.armM),
      mats.lens,
      { reflect: true, receive: false, name: 'lamp-lens' },
    );
  }
  const lamp = new THREE.PointLight('#FFB866', 0, 16, 2);
  lamp.position.set(S.lamp.x, LH - 0.35, lampZ + S.lamp.armM);
  lamp.name = 'lamp-light';
  group.add(lamp);

  // Tree in a grated pit.
  {
    const tz = curbZ - S.tree.fromCurbM;
    const tx = S.tree.x;
    add(
      new THREE.CylinderGeometry(0.075, 0.12, S.tree.trunkM + 0.6, 6, 1).translate(
        tx,
        (S.tree.trunkM + 0.6) / 2,
        tz,
      ),
      mats.trunk,
      { cast: true, reflect: true, name: 'tree-trunk' },
    );
    const leaves: Part[] = [
      [1.05, 0, 3.35, 0],
      [0.85, 0.55, 2.95, 0.3],
      [0.8, -0.5, 3.0, -0.25],
      [0.7, 0.1, 3.95, -0.2],
    ].map(([r, x, y, z], j) => ({
      geo: new THREE.IcosahedronGeometry(r, 0).rotateY(j * 1.3).rotateX(j * 0.7),
      matrix: new THREE.Matrix4().makeTranslation(tx + x, y, tz + z),
    }));
    add(mergeParts(leaves), mats.leaf, { cast: true, reflect: true, name: 'tree-canopy' });
    add(new THREE.BoxGeometry(1.1, 0.012, 1.1).translate(tx, 0.006, tz), mats.grate, {
      reflect: true,
      name: 'tree-grate',
    });
  }

  // Bench under the right window, bin beside the machine.
  {
    const bz = wallZ + 0.3;
    const bx = S.bench.x;
    const bl = S.bench.lengthM;
    add(
      merged([
        boxPart(bl, 0.05, 0.42, bx, 0.45, bz),
        boxPart(bl, 0.3, 0.04, bx, 0.72, wallZ + 0.1),
      ]),
      mats.wood,
      { cast: true, reflect: true, name: 'bench' },
    );
    add(
      merged([
        boxPart(0.05, 0.45, 0.4, bx - bl / 2 + 0.15, 0.225, bz),
        boxPart(0.05, 0.45, 0.4, bx + bl / 2 - 0.15, 0.225, bz),
      ]),
      mats.frame,
      { cast: true, reflect: true, name: 'bench-legs' },
    );
    const B = S.bin;
    const x = -machineWidthM / 2 - B.gapM - B.radiusM;
    const z = wallZ + B.radiusM + 0.06;
    add(new THREE.CylinderGeometry(B.radiusM, B.radiusM * 0.92, B.heightM, 8, 1).translate(x, B.heightM / 2, z), mats.bin, {
      cast: true,
      reflect: true,
      name: 'bin',
    });
    add(
      new THREE.CylinderGeometry(B.radiusM + 0.015, B.radiusM + 0.015, 0.05, 8, 1).translate(
        x,
        B.heightM + 0.02,
        z,
      ),
      mats.frame,
      { cast: true, reflect: true, name: 'bin-lid' },
    );
  }

  const mirror = new THREE.Group();
  mirror.name = 'street-mirror';
  for (const m of reflected) {
    const r = new THREE.Mesh(m.geometry, m.material);
    r.name = `${m.name}-mirror`;
    mirror.add(r);
  }

  const tmp = new THREE.Color();
  const tmp2 = new THREE.Color();
  function setLook(p: Palette, night: number) {
    mats.land.color.set(p.land);
    mats.asphalt.color.set(p.road).lerp(tmp.set('#3B3E43'), 0.5);
    mats.sidewalk.color.set(p.land).lerp(tmp.set('#A8A49C'), 0.4);
    mats.curb.color.copy(mats.sidewalk.color).lerp(tmp.set('#FFFFFF'), 0.12);
    mats.joint.color.copy(mats.sidewalk.color).multiplyScalar(0.86);
    mats.marking.color.copy(mats.asphalt.color).lerp(tmp.set('#ECE8DC'), 0.7);
    mats.facade.color.set(p.building).lerp(tmp.set('#CBBFAF'), 0.3);
    mats.stone.color.copy(mats.facade.color).multiplyScalar(0.8);
    // What the glass reflects: the sky, a little darker.
    mats.interior.color.set(p.sky).lerp(tmp2.set('#11161B'), 0.2 + 0.2 * night);
    mats.lens.emissiveIntensity = 2.8 * night;
    mats.litWin.emissiveIntensity = 0.85 * night;
    lamp.intensity = 14 * night;
    lamp.visible = night > 0.02;
  }

  return {
    group,
    mirror,
    lamp,
    setLook,
    dispose() {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      for (const m of Object.values(mats)) m.dispose();
    },
  };
}
