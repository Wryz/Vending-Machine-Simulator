/**
 * Browser entry for `npm run sprites`: procedural model -> GLB (GLTFExporter)
 * -> GLTFLoader -> orthographic sprite renders (SPEC §7.3).
 */
import { MACHINE_SPRITES } from '@/config/map';
import { PRESETS, type PresetName } from '@/config/timeOfDay';
import { headingToRotationY } from '@/map/cameraMatch';
import type { SunState } from '@/map/sun';
import { sceneLighting } from '@/three/lightingRig';

import {
  addLights,
  b64ToBuf,
  bloom,
  bufToB64,
  canvasToB64,
  contactShadow,
  downsample,
  exportGLB,
  getModelDef,
  lightPool,
  loadGLB,
  MODEL_DEFS,
  rendererFor,
  setGlow,
  THREE,
} from './scene';

export interface SpriteConfig {
  width: number;
  height: number;
  pxPerMeter: number;
  anchorOffsetPx: number;
  supersample: number;
}

type Light = (typeof MACHINE_SPRITES.lighting)[number];

/**
 * Representative sun per sprite light, relative to a camera looking north.
 * `fill` / `key` multiply the hemisphere (ambient) and sun/moon light for
 * sprites only: at map scale the palette's dusk/night intensities leave the
 * cabinet a black blob against the dark map.
 */
const LIGHTS: Record<
  Light,
  { sun: SunState; preset: PresetName; shadow: number; pool: number; fill: number; key: number }
> = {
  // High sun from the SSE: front and right side lit.
  day: {
    sun: { altitudeDeg: 50, bearingDeg: 155, rising: false },
    preset: 'day',
    shadow: 0.42,
    pool: 0,
    fill: 1,
    key: 1,
  },
  // Low warm sun from the west-southwest.
  dusk: {
    sun: { altitudeDeg: 4, bearingDeg: 240, rising: false },
    preset: 'dusk',
    shadow: 0.34,
    pool: 0,
    fill: 1.4,
    key: 1,
  },
  // Sun below the horizon: moon key + emissive fronts + a faint light spill.
  night: {
    sun: { altitudeDeg: -20, bearingDeg: 0, rising: false },
    preset: 'night',
    shadow: 0.45,
    pool: 0.12,
    fill: 2.8,
    key: 1.25,
  },
};

export const modelIds = () => MODEL_DEFS.map((m) => m.id);

export async function exportModel(id: string) {
  const { glb, triangles } = await exportGLB(getModelDef(id));
  return { glb: bufToB64(glb), triangles };
}

export async function renderModel(id: string, glbB64: string, cfg: SpriteConfig) {
  const loaded = await loadGLB(b64ToBuf(glbB64));
  const ss = cfg.supersample;
  const W = cfg.width * ss;
  const H = cfg.height * ss;
  const renderer = rendererFor(undefined, W, H, true);

  const size = loaded.box.getSize(new THREE.Vector3());
  const pivot = new THREE.Group();
  pivot.add(loaded.group);
  const shadow = contactShadow(size.x, size.z, 0.4);
  const pool = lightPool(size.x, size.z, 0);
  pivot.add(shadow, pool);

  const ppm = cfg.pxPerMeter;
  const cam = new THREE.OrthographicCamera(
    -cfg.width / 2 / ppm,
    cfg.width / 2 / ppm,
    (cfg.height - cfg.anchorOffsetPx) / ppm,
    -cfg.anchorOffsetPx / ppm,
    0.1,
    100,
  );

  const out: { name: string; rgba: string }[] = [];
  for (const light of MACHINE_SPRITES.lighting) {
    const L = LIGHTS[light];
    const palette = PRESETS[L.preset];
    const lighting = sceneLighting(L.sun, palette);
    const scene = new THREE.Scene();
    scene.add(pivot);
    const rig = addLights(scene, lighting, {
      glowAt: new THREE.Vector3(0, size.y * 0.6, size.z / 2 + 0.7),
    });
    pivot.add(rig.glow); // the warm fill sits in front of the machine and turns with it
    rig.hemi.intensity *= L.fill;
    rig.sun.intensity *= L.key;
    setGlow(loaded, lighting.machineGlow);
    (shadow.material as THREE.MeshBasicMaterial).opacity = L.shadow;
    (pool.material as THREE.MeshBasicMaterial).opacity = L.pool;
    pool.visible = L.pool > 0;

    for (let h = 0; h < MACHINE_SPRITES.headings; h++) {
      // Bucket h: front rotated h×45° clockwise (seen from above) from facing the camera.
      // The light rig stays fixed relative to the camera (the light pool turns with the machine).
      pivot.rotation.y = headingToRotationY(180 + h * 45);
      for (const pitch of MACHINE_SPRITES.pitches) {
        const p = (pitch * Math.PI) / 180;
        cam.position.set(0, Math.cos(p) * 20, Math.sin(p) * 20);
        cam.up.set(0, 1, 0);
        cam.lookAt(0, 0, 0);
        cam.updateProjectionMatrix();
        renderer.render(scene, cam);
        const small = downsample(renderer.domElement, ss);
        if (light === 'night') bloom(small, 0.62, 2, 0.55);
        else if (light === 'dusk') bloom(small, 0.72, 1.5, 0.3);
        out.push({ name: `machine-${id}-h${h}-p${pitch}-${light}`, rgba: canvasToB64(small) });
      }
    }
    pivot.remove(rig.glow);
    scene.remove(pivot);
  }
  renderer.dispose();
  return { sprites: out, triangles: loaded.triangles, size: [size.x, size.y, size.z] };
}
