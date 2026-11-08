/**
 * Browser entry for `npm run life-sprites`: procedural low-poly pedestrians
 * (walk cycle + machine-visit poses) -> orthographic sprite renders (8
 * viewer-relative headings × the 2 map pitches × day/night), with the
 * machine sprites' conventions (src/map/life/sprites.ts) and lighting rig;
 * plus flat thought bubbles drawn in 2D (one per kind, pitch and light).
 *
 * Every sprite is cropped symmetrically around the person's ground center, so
 * the map layer can use `icon-anchor: 'center'` with no per-image offset.
 */
import { LIFE_BUBBLES, LIFE_FRAMES, LIFE_PEOPLE_MODELS } from '@/config/mapLife';
import { PRESETS, type PresetName } from '@/config/timeOfDay';
import { headingToRotationY } from '@/map/cameraMatch';
import {
  bubbleSpriteName,
  LIFE_HEADINGS,
  LIFE_PITCHES,
  LIFE_LIGHTS,
  personSpriteName,
  type LifeLight,
} from '@/map/life/sprites';
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
    for (let f = 0; f < LIFE_FRAMES; f++)
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

// ------------------------------------------------------------ thought bubbles

/** Flat bubble colors (no outlines): a soft drop shape under a light fill. */
const BUBBLE_FILL: Record<LifeLight, string> = { day: '#FFFFFF', night: '#ECE8F7' };
const BUBBLE_SHADOW = 'rgba(38, 42, 72, 0.2)';
const INK = '#4A4F63';

/**
 * Bubble geometry in meters on the sprite plane (x right, y up from the
 * person's ground center): it floats above-right of the head, whose center
 * projects to HEAD_Y·sin(pitch) under the map's tilted orthographic camera.
 */
const HEAD_Y = 1.6;
const BUBBLE = { w: 1.0, h: 0.66, dx: 0.32, gap: 0.62 };

function bubbleGlyph(g: CanvasRenderingContext2D, kind: string, cx: number, cy: number) {
  const circle = (x: number, y: number, r: number, color: string) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  // Canvas y grows downward: cy is the glyph center in canvas meters.
  if (kind === 'dots') {
    for (const k of [-1, 0, 1]) circle(cx + k * 0.22, cy, 0.065, INK);
  } else if (kind === 'coin') {
    circle(cx, cy, 0.22, '#E0A22E');
    circle(cx, cy - 0.015, 0.2, '#F4BE4A');
    circle(cx, cy - 0.015, 0.12, '#E9AE35');
    circle(cx - 0.07, cy - 0.09, 0.035, '#FBE3A0');
  } else {
    // A plain drink can: lid, colored body, a light band (no brand).
    const w = 0.26;
    const h = 0.42;
    const x0 = cx - w / 2;
    const y0 = cy - h / 2;
    g.fillStyle = '#E85A50';
    g.beginPath();
    g.roundRect(x0, y0, w, h, 0.05);
    g.fill();
    g.fillStyle = '#C9CED8';
    g.beginPath();
    g.roundRect(x0, y0, w, 0.07, [0.05, 0.05, 0, 0]);
    g.fill();
    g.fillStyle = '#F6E7D0';
    g.fillRect(x0, cy - 0.02, w, 0.09);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x0 + 0.04, y0 + 0.1, 0.04, h - 0.16);
  }
}

/** Every thought-bubble sprite, cropped symmetric around the ground center. */
export function renderBubbles(cfg: LifeSpriteConfig) {
  const out: { name: string; width: number; height: number; rgba: string }[] = [];
  const ppm = cfg.pxPerMeter * cfg.supersample;
  for (const light of LIFE_LIGHTS)
    for (const pitch of LIFE_PITCHES) {
      const headY = HEAD_Y * Math.sin((pitch * Math.PI) / 180);
      const base = headY + BUBBLE.gap;
      const top = base + BUBBLE.h + 0.06;
      const halfW = BUBBLE.dx + BUBBLE.w / 2 + 0.06;
      for (const kind of LIFE_BUBBLES) {
        const c = document.createElement('canvas');
        c.width = Math.ceil(2 * halfW * ppm);
        c.height = Math.ceil(2 * top * ppm);
        const g = c.getContext('2d')!;
        // Meters, origin at the ground center, y down (canvas convention).
        g.setTransform(ppm, 0, 0, ppm, c.width / 2, c.height / 2);
        const cx = BUBBLE.dx;
        const cy = -(base + BUBBLE.h / 2);
        const shape = (dy: number) => {
          g.beginPath();
          g.roundRect(cx - BUBBLE.w / 2, cy - BUBBLE.h / 2 + dy, BUBBLE.w, BUBBLE.h, BUBBLE.h / 2);
          // Cloud bumps on top, and the trail of little puffs down to the head.
          g.moveTo(cx - 0.18 + 0.2, cy - BUBBLE.h / 2 + 0.06 + dy);
          g.arc(cx - 0.18, cy - BUBBLE.h / 2 + 0.06 + dy, 0.2, 0, Math.PI * 2);
          g.moveTo(cx + 0.16 + 0.17, cy - BUBBLE.h / 2 + 0.07 + dy);
          g.arc(cx + 0.16, cy - BUBBLE.h / 2 + 0.07 + dy, 0.17, 0, Math.PI * 2);
          g.moveTo(0.1 + 0.075, -(headY + 0.46) + dy);
          g.arc(0.1, -(headY + 0.46) + dy, 0.075, 0, Math.PI * 2);
          g.moveTo(0.02 + 0.045, -(headY + 0.33) + dy);
          g.arc(0.02, -(headY + 0.33) + dy, 0.045, 0, Math.PI * 2);
          g.fill('nonzero');
        };
        g.fillStyle = BUBBLE_SHADOW;
        shape(0.04);
        g.fillStyle = BUBBLE_FILL[light];
        shape(0);
        bubbleGlyph(g, kind, cx, cy + 0.02);
        const small = downsample(c, cfg.supersample);
        out.push({ name: bubbleSpriteName(kind, pitch, light), ...cropCentered(small) });
      }
    }
  return { sprites: out };
}
