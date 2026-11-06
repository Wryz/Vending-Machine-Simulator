/**
 * Browser entry for `npm run life-sprites`: procedural low-poly pedestrians
 * -> orthographic sprite renders (8 viewer-relative headings ×
 * the 2 map pitches × day/night), with the machine sprites' conventions
 * (src/map/life/sprites.ts) and lighting rig.
 *
 * Every sprite is cropped symmetrically around the person's ground center, so
 * the map layer can use `icon-anchor: 'center'` with no per-image offset.
 */
import { LIFE_PEOPLE_MODELS, LIFE_WALK_FRAMES } from '@/config/mapLife';
import { PRESETS, type PresetName } from '@/config/timeOfDay';
import { headingToRotationY } from '@/map/cameraMatch';
import { LIFE_HEADINGS, LIFE_PITCHES, personSpriteName, type LifeLight } from '@/map/life/sprites';
import type { SunState } from '@/map/sun';
import { sceneLighting } from '@/three/lightingRig';

import { addLights, contactShadow, downsample, rendererFor, THREE } from '../scene';

import { createPerson, type LifeModel } from './models';

export interface LifeSpriteConfig {
  pxPerMeter: number;
  supersample: number;
}

/** Same representative suns as the machine sprites (camera looking north). */
const LIGHTS: Record<
  LifeLight,
  { sun: SunState; preset: PresetName; shadow: number; fill: number; key: number }
> = {
  day: {
    sun: { altitudeDeg: 50, bearingDeg: 155, rising: false },
    preset: 'day',
    shadow: 0.5,
    fill: 1,
    key: 1,
  },
  night: {
    sun: { altitudeDeg: -20, bearingDeg: 0, rising: false },
    preset: 'night',
    shadow: 0.5,
    fill: 4.2,
    key: 2,
  },
};

interface Job {
  model: string;
  frame: number;
  build: () => LifeModel;
  /** Square render canvas side, meters (covers every heading and pitch). */
  extentM: number;
}

export function jobs(): { model: string; frame: number }[] {
  return allJobs().map(({ model, frame }) => ({ model, frame }));
}

function allJobs(): Job[] {
  const out: Job[] = [];
  for (const m of LIFE_PEOPLE_MODELS)
    for (let f = 0; f < LIFE_WALK_FRAMES; f++)
      out.push({ model: m, frame: f, build: () => createPerson(m, f), extentM: 4 });
  return out;
}

/** Crop symmetric around the canvas center to the visible pixels (+1 px). */
function cropCentered(c: HTMLCanvasElement) {
  const g = c.getContext('2d')!;
  const { width: W, height: H } = c;
  const d = g.getImageData(0, 0, W, H).data;
  let hx = 1;
  let hy = 1;
  const cx = W / 2;
  const cy = H / 2;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] < 3) continue;
      hx = Math.max(hx, Math.abs(x + 0.5 - cx));
      hy = Math.max(hy, Math.abs(y + 0.5 - cy));
    }
  const w = Math.min(W, 2 * Math.ceil(hx + 1));
  const h = Math.min(H, 2 * Math.ceil(hy + 1));
  const x0 = Math.round(cx - w / 2);
  const y0 = Math.round(cy - h / 2);
  const img = g.getImageData(x0, y0, w, h);
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < img.data.length; i += CH)
    s += String.fromCharCode(...img.data.subarray(i, i + CH));
  return { width: w, height: h, rgba: btoa(s) };
}

export function renderJob(index: number, cfg: LifeSpriteConfig) {
  const job = allJobs()[index];
  const model = job.build();
  const ss = cfg.supersample;
  const size = Math.ceil(job.extentM * cfg.pxPerMeter);
  const S = size * ss;
  const renderer = rendererFor(undefined, S, S, true);

  const pivot = new THREE.Group();
  pivot.add(model.group);
  const shadow = contactShadow(model.footprint.w, model.footprint.d, 0.45);
  shadow.scale.set(0.9, 1, 1.2);
  pivot.add(shadow);

  const half = size / 2 / cfg.pxPerMeter;
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 100);

  const out: { name: string; width: number; height: number; rgba: string }[] = [];
  for (const light of ['day', 'night'] as const) {
    const L = LIGHTS[light];
    const lighting = sceneLighting(L.sun, PRESETS[L.preset]);
    const scene = new THREE.Scene();
    scene.add(pivot);
    const rig = addLights(scene, lighting);
    rig.glow.intensity = 0;
    rig.hemi.intensity *= L.fill * (light === 'night' ? 1.9 : 1);
    rig.sun.intensity *= L.key;
    (shadow.material as THREE.MeshBasicMaterial).opacity = L.shadow;
    for (let h = 0; h < LIFE_HEADINGS; h++) {
      pivot.rotation.y = headingToRotationY(180 + h * (360 / LIFE_HEADINGS));
      for (const pitch of LIFE_PITCHES) {
        const p = (pitch * Math.PI) / 180;
        cam.position.set(0, Math.cos(p) * 20, Math.sin(p) * 20);
        cam.up.set(0, 1, 0);
        cam.lookAt(0, 0, 0);
        cam.updateProjectionMatrix();
        renderer.render(scene, cam);
        const small = downsample(renderer.domElement, ss);
        const name = personSpriteName(job.model, job.frame, h, pitch, light);
        out.push({ name, ...cropCentered(small) });
      }
    }
    scene.remove(pivot);
    scene.clear();
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return { sprites: out, triangles: model.triangles };
}
