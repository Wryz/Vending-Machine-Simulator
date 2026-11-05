/**
 * Browser entry for the 3D close-up preview: the GLB machine on a sidewalk in
 * front of a facade, lit by `sceneLighting` for the real New York sun.
 */
import { CLOSEUP_CAMERA } from '@/config/machines';
import { bearingToVector } from '@/map/cameraMatch';
import { getTimeOfDay } from '@/map/timeOfDay';
import { sceneLighting } from '@/three/lightingRig';

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
