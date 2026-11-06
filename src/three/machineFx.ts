import * as THREE from 'three';

import { CLOSEUP_MOTION } from '@/config/streetLife';

import {
  clamp01,
  coinGlintsMs,
  dropPose,
  flicker,
  pulse,
  restockPlan,
  slideProgress,
  type DropPose,
} from './life/interactions';
import { mergeParts, type Part } from './life/geometry';
import type { VendingMachineModel } from './models/vendingMachine';

/**
 * Close-up machine animations on top of the procedural model (SPEC §3.6):
 * restocked blocks slide forward off the back of the coil, a sold product
 * tips and falls to the bin, the cash door opens and coins glint, a broken
 * machine's screen flickers with one product stuck at an angle, and the
 * selected slot breathes a soft amber. Plain three.js: the R3F scene and the
 * headless previews drive the same code. Times are in milliseconds.
 */

export interface MachineFx {
  /** Extra meshes (cash door, coins, falling products) in the model's frame. */
  group: THREE.Group;
  restock(slots: readonly number[], nowMs: number): void;
  /** Returns the product color when a visible product started to drop. */
  sale(slot: number, nowMs: number): THREE.Color | null;
  collect(nowMs: number): void;
  setBroken(broken: boolean): void;
  setSelected(slot: number | null): void;
  /** `glow` is the time-of-day glow already applied to the model. */
  update(nowMs: number, glow: number): void;
  dispose(): void;
}

interface SlotBase {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  material: THREE.MeshStandardMaterial;
}

const AMBER = new THREE.Color('#D9932B');
const WARM = new THREE.Color('#FFE6BF');
/** Emissive share of a product's own color at full night glow. */
const PRODUCT_GLOW = 0.32;
const MAX_DROPS = 3;

export function createMachineFx(model: VendingMachineModel): MachineFx {
  const M = CLOSEUP_MOTION;
  const frontZ = model.dims.depthM / 2;
  const slots: SlotBase[] = model.slots.map((mesh) => ({
    mesh,
    position: mesh.position.clone(),
    material: mesh.material as THREE.MeshStandardMaterial,
  }));
  let screen: THREE.MeshStandardMaterial | null = null;
  let coinReturn: THREE.Object3D | null = null;
  model.group.traverse((o) => {
    if (o instanceof THREE.Mesh && o.name === 'screen')
      screen = o.material as THREE.MeshStandardMaterial;
    if (o.name === 'coin-return') coinReturn = o;
  });
  const screenMat = screen as THREE.MeshStandardMaterial | null;
  const screenBase = model.emissive.find((e) => e.material === screenMat)?.base ?? 1.6;
  const ctrlX = (coinReturn as THREE.Object3D | null)?.position.x ?? model.dims.widthM * 0.35;

  const group = new THREE.Group();
  group.name = 'machine-fx';

  // Cash door on the control column, hinged on its left edge.
  const doorW = 0.17;
  const doorH = 0.26;
  const hinge = new THREE.Group();
  hinge.position.set(ctrlX - doorW / 2, 0.3, frontZ + 0.008);
  const steel = new THREE.MeshStandardMaterial({
    color: '#9EA3A8',
    roughness: 0.35,
    metalness: 0.7,
    flatShading: true,
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.014), steel);
  door.position.set(doorW / 2, 0, 0);
  door.castShadow = true;
  const lock = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.022, 0.01),
    new THREE.MeshStandardMaterial({ color: '#2A2D31', roughness: 0.4, metalness: 0.6 }),
  );
  lock.position.set(doorW - 0.03, 0.06, 0.011);
  door.add(lock);
  hinge.add(door);
  const opening = new THREE.Mesh(
    new THREE.BoxGeometry(doorW - 0.01, doorH - 0.01, 0.004),
    new THREE.MeshStandardMaterial({ color: '#121416', roughness: 0.9 }),
  );
  opening.position.set(ctrlX, 0.3, frontZ + 0.002);
  group.add(hinge, opening);

  // Coins: one instanced mesh, gold and silver.
  const coinGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.004, 10, 1).rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.28,
    metalness: 0.85,
    emissive: new THREE.Color('#FFE3A0'),
    emissiveIntensity: 0,
  });
  const coins = new THREE.InstancedMesh(coinGeo, coinMat, M.coins.count);
  coins.frustumCulled = false;
  coins.count = 0;
  const coinBase = Array.from(
    { length: M.coins.count },
    (_, i) => new THREE.Color(i % 3 === 0 ? '#C8CCD0' : '#D2B163'),
  );
  const coinColor = new THREE.Color();
  for (let i = 0; i < M.coins.count; i++) coins.setColorAt(i, coinBase[i]);
  group.add(coins);
  const glints = coinGlintsMs();

  // Falling products reuse the slot's own geometry and material.
  const drops = Array.from({ length: MAX_DROPS }, () => {
    const mesh = new THREE.Mesh(slots[0]?.mesh.geometry, slots[0]?.material);
    mesh.name = 'falling-product';
    mesh.visible = false;
    mesh.castShadow = false;
    group.add(mesh);
    return { mesh, slot: -1, start: 0 };
  });
  const pose: DropPose = { dz: 0, dy: 0, tip: 0, falling: false };

  const restockStart = new Float64Array(slots.length).fill(Number.NaN);
  const restockDelay = new Float64Array(slots.length);
  let collectAt = Number.NaN;
  let broken = false;
  let stuck = -1;
  let selected: number | null = null;

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);

  function pickStuck(): number {
    const rows = Math.round(slots.length / Math.max(1, countCols()));
    const cols = countCols();
    const preferred = Math.floor(rows / 2) * cols + Math.min(1, cols - 1);
    if (slots[preferred]?.mesh.visible) return preferred;
    return slots.findIndex((sl) => sl.mesh.visible);
  }
  function countCols(): number {
    let n = 0;
    for (const sl of slots) if (sl.mesh.name.startsWith('slot-0-')) n++;
    return Math.max(1, n);
  }

  return {
    group,
    restock(list, nowMs) {
      const plan = restockPlan(list.length);
      list.forEach((slot, i) => {
        if (slot < 0 || slot >= slots.length) return;
        restockStart[slot] = nowMs;
        restockDelay[slot] = plan.delaysMs[i];
      });
    },
    sale(slot, nowMs) {
      const sl = slots[slot];
      if (!sl || !sl.mesh.visible) return null;
      const d = drops.find((x) => !x.mesh.visible) ?? drops[0];
      d.mesh.geometry = sl.mesh.geometry;
      d.mesh.material = sl.material;
      d.slot = slot;
      d.start = nowMs;
      d.mesh.visible = true;
      return sl.material.color;
    },
    collect(nowMs) {
      collectAt = nowMs;
    },
    setBroken(b) {
      if (b === broken) return;
      broken = b;
      if (stuck >= 0) {
        const sl = slots[stuck];
        sl.mesh.rotation.set(0, 0, 0);
        sl.mesh.position.copy(sl.position);
      }
      stuck = b ? pickStuck() : -1;
    },
    setSelected(slot) {
      selected = slot;
    },
    update(nowMs, glow) {
      const tS = nowMs / 1000;
      const productGlow = PRODUCT_GLOW * glow * (broken ? 0.5 : 1);
      // Slots: restock slide + flash, selection pulse, stuck product.
      for (let i = 0; i < slots.length; i++) {
        const sl = slots[i];
        let flash = 0;
        if (!Number.isNaN(restockStart[i])) {
          const el = nowMs - restockStart[i];
          const prog = slideProgress(el, restockDelay[i]);
          sl.mesh.position.z = sl.position.z - M.restock.slideM * (1 - prog);
          const after = el - restockDelay[i];
          flash = after < 0 ? 0 : 1 - clamp01(after / M.restock.flashMs);
          if (prog >= 1 && flash <= 0) {
            restockStart[i] = Number.NaN;
            sl.mesh.position.z = sl.position.z;
          }
        }
        if (i === stuck) {
          sl.mesh.rotation.set(-0.12, 0, 0.24);
          sl.mesh.position.set(sl.position.x + 0.01, sl.position.y - 0.012, sl.position.z + 0.022);
        }
        const sel = i === selected ? 0.22 + 0.33 * pulse(tS) : 0;
        if (sel > 0) {
          sl.material.emissive.copy(AMBER);
          sl.material.emissiveIntensity = sel + productGlow;
        } else if (flash > 0) {
          sl.material.emissive.copy(WARM);
          sl.material.emissiveIntensity = 0.5 * flash + productGlow;
        } else {
          // Product lighting behind the glass after dusk (LED strips).
          sl.material.emissive.copy(sl.material.color);
          sl.material.emissiveIntensity = productGlow;
        }
      }

      // Broken: screen flickers (visible by day too).
      if (screenMat) {
        screenMat.emissiveIntensity = broken
          ? screenBase * Math.max(glow, 0.4) * flicker(tS)
          : screenBase * glow;
      }

      // Falling products.
      for (const d of drops) {
        if (!d.mesh.visible) continue;
        const base = slots[d.slot].position;
        dropPose(pose, nowMs - d.start, Math.max(0.2, base.y - 0.3));
        d.mesh.position.set(base.x, base.y - pose.dy, frontZ - 0.025 + pose.dz - 0.035);
        d.mesh.rotation.set(pose.tip, 0, 0);
        d.mesh.scale.set(0.96, 0.96, 0.4);
        if (!pose.falling || base.y - pose.dy < 0.38) d.mesh.visible = false;
      }

      // Cash door and coins.
      const el = nowMs - collectAt;
      const total =
        M.coins.firstCoinMs + M.coins.count * M.coins.staggerMs + M.coins.slideMs + M.coins.holdMs;
      if (!Number.isNaN(collectAt) && el >= 0 && el <= total) {
        const open = clamp01(el / M.coins.doorMs) * (1 - clamp01((el - total + 300) / 300));
        hinge.rotation.y = -1.25 * (1 - (1 - open) ** 3);
        let n = 0;
        let glint = 0;
        for (let i = 0; i < M.coins.count; i++) {
          const u = (el - (M.coins.firstCoinMs + i * M.coins.staggerMs)) / M.coins.slideMs;
          if (u < 0) continue;
          const uc = clamp01(u);
          const lateral = ((i * 37) % 7) / 7 - 0.5;
          p.set(
            ctrlX + lateral * 0.08,
            0.24 - 0.1 * uc * uc + 0.004 * i,
            frontZ + 0.02 + 0.07 * uc,
          );
          q.setFromEuler(e.set(0.4 + uc * 1.1, lateral * 2, uc * 6 + i));
          const fade = 1 - clamp01((el - total + 250) / 250);
          s.setScalar(Math.max(0.001, fade));
          coins.setMatrixAt(n, m4.compose(p, q, s));
          const g = Math.sin(Math.PI * uc);
          glint = Math.max(glint, g * (1 - Math.abs(el - glints[i]) / M.coins.slideMs));
          coins.setColorAt(n, coinColor.copy(coinBase[i]).multiplyScalar(1 + 1.6 * g));
          n++;
        }
        coins.count = n;
        coins.instanceMatrix.needsUpdate = true;
        if (coins.instanceColor) coins.instanceColor.needsUpdate = true;
        coinMat.emissiveIntensity = 0.6 * Math.max(0, glint);
      } else if (coins.count || hinge.rotation.y !== 0) {
        coins.count = 0;
        hinge.rotation.y = 0;
      }
    },
    dispose() {
      door.geometry.dispose();
      lock.geometry.dispose();
      opening.geometry.dispose();
      coinGeo.dispose();
      coinMat.dispose();
      steel.dispose();
    },
  };
}

/**
 * Tiny parts (keypad buttons, coin slot…) cast no visible shadow at close-up
 * distance; dropping them from the shadow pass saves ~20 draw calls.
 */
export function trimShadowCasters(model: VendingMachineModel, minSizeM = 0.06): void {
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  model.group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.castShadow) return;
    o.geometry.computeBoundingBox();
    box.copy(o.geometry.boundingBox!).getSize(size);
    if (Math.max(size.x, size.y) < minSizeM) o.castShadow = false;
  });
}

/**
 * A copy of the machine for the shop-window reflection. Static parts are
 * merged per material (a handful of draw calls instead of ~75); slots stay
 * separate and `sync` mirrors their state. Shares materials, so glow and
 * flicker follow.
 */
export function createMachineMirror(model: VendingMachineModel): {
  group: THREE.Group;
  sync(): void;
} {
  const group = new THREE.Group();
  group.name = 'vending-machine-mirror';
  model.group.updateMatrixWorld(true);
  const toLocal = new THREE.Matrix4().copy(model.group.matrixWorld).invert();
  const byMaterial = new Map<THREE.Material, Part[]>();
  const slotNames = new Set(model.slots.map((m) => m.name));
  model.group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || slotNames.has(o.name)) return;
    const mat = o.material as THREE.Material;
    const parts = byMaterial.get(mat) ?? [];
    parts.push({
      geo: o.geometry,
      matrix: new THREE.Matrix4().multiplyMatrices(toLocal, o.matrixWorld),
    });
    byMaterial.set(mat, parts);
  });
  for (const [mat, parts] of byMaterial) {
    const m = new THREE.Mesh(mergeParts(parts), mat);
    m.name = 'machine-mirror-part';
    group.add(m);
  }
  const pairs = model.slots.map((src) => {
    const dst = new THREE.Mesh(src.geometry, src.material);
    dst.name = `${src.name}-mirror`;
    group.add(dst);
    return [src, dst] as const;
  });
  return {
    group,
    sync() {
      for (const [src, dst] of pairs) {
        dst.visible = src.visible;
        dst.position.copy(src.position);
        dst.rotation.copy(src.rotation);
        dst.scale.copy(src.scale);
      }
    },
  };
}
