'use no memo';
// three.js objects are mutated every frame; keep the React Compiler out of this file.
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber/native';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as THREE from 'three';

import { getMachineType, type MachineTypeId } from '@/config/machines';
import { CLOSEUP_MOTION } from '@/config/streetLife';
import type { Palette } from '@/config/timeOfDay';
import { blendSceneCameras, headingToRotationY, type SceneCamera } from '@/map/cameraMatch';
import type { SunState } from '@/map/sun';

import { dragOrbit, follow, idleCamera, orbitWeight, rotateY } from './life/camera';
import { countSceneTriangles } from './life/geometry';
import { createStreetScene } from './life/streetScene';
import { createTapGate, gateActivate, gateBegin, gateClick, gateFinalize } from './life/tapGate';
import { sceneLighting } from './lightingRig';
import { createMachineFx, createMachineMirror, trimShadowCasters } from './machineFx';
import { createVendingMachine, setMachineGlow } from './models/vendingMachine';

/**
 * R3F close-up scene (SPEC §7.3): one low-poly machine on a real-feeling
 * street (pedestrians, cars, lamp, tree, shop windows that reflect the road),
 * lit by the city's real sun; fronts glow after dusk. Budget (§7.4): ~30K
 * tris, at most 2 shadow-casting lights (we use 1).
 */
export interface SlotView {
  color: string | null;
  /** 0..1 fill level; 0 hides the product block. */
  fill: number;
}

/** One-shot scene events; a new `id` replays the animation. */
export interface SlotsEvent {
  id: number;
  slots: number[];
}

export interface SceneStats {
  walkers: number;
  cars: number;
  /** Triangles submitted per frame (visible meshes, instanced × count; no shadow pass). */
  triangles: number;
}

export interface MachineSceneProps {
  typeId: MachineTypeId;
  accent: string;
  slots: SlotView[];
  sun: SunState;
  palette: Palette;
  /** Compass heading the machine faces. */
  heading: number;
  /** Camera animates from `from` to `to` over `durationMs` (map -> close-up framing). */
  from: SceneCamera;
  to: SceneCamera;
  durationMs: number;
  broken?: boolean;
  selectedSlot?: number | null;
  onSlotPress?: (index: number) => void;
  onFps?: (fps: number) => void;
  onReady?: () => void;
  transparent?: boolean;
  /** 0..1 pedestrians and cars (real traffic at this spot and hour). */
  crowd?: number;
  traffic?: number;
  leftHandTraffic?: boolean;
  /** Stable per machine so its street looks the same on every visit. */
  seed?: number;
  /** Restock committed: these slots slide in. */
  restockEvent?: SlotsEvent | null;
  /** Sales seen live: these slots drop a product. */
  saleEvent?: SlotsEvent | null;
  /** Cash box opened (new id = play the coin door). */
  collectEvent?: number | null;
  /** Fired when a customer at the machine picks up a dropped product. */
  onPickup?: () => void;
  onStats?: (stats: SceneStats) => void;
  /** Horizontal drag orbits the camera ±35° (default on). */
  orbit?: boolean;
}

interface OrbitState {
  target: number;
  current: number;
  start: number;
}

/** Street-life clock origin (seconds); any monotonic clock works. */
const T0 = Date.now();
const lifeSeconds = (nowMs: number) => (nowMs - T0) / 1000;

function CameraRig({
  from,
  to,
  durationMs,
  orbit,
}: {
  from: SceneCamera;
  to: SceneCamera;
  durationMs: number;
  orbit: OrbitState;
}) {
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  const settled = useRef<number | null>(null);
  const last = useRef(0);
  const target = useMemo(() => new THREE.Vector3(), []);
  const idle = useMemo(() => ({ yawDeg: 0, dy: 0 }), []);
  const xz = useMemo<[number, number]>(() => [0, 0], []);
  useFrame(() => {
    const now = Date.now();
    start.current ??= now;
    const t = durationMs > 0 ? (now - start.current) / durationMs : 1;
    const c = blendSceneCameras(from, to, t);
    // Idle sway/breathing once the dolly has settled; drag orbit on top.
    if (t >= 1) settled.current ??= now;
    else settled.current = null;
    const dt = last.current ? (now - last.current) / 1000 : 0;
    last.current = now;
    const o = orbit;
    o.current = follow(o.current, o.target, dt, CLOSEUP_MOTION.orbitFollow);
    idleCamera(idle, settled.current ? (now - settled.current) / 1000 : 0);
    const [px, py, pz] = c.position;
    const w = orbitWeight(Math.hypot(px, py, pz));
    rotateY(xz, px, pz, (o.current + idle.yawDeg) * w);
    camera.position.set(xz[0], py + idle.dy * w, xz[1]);
    target.set(...c.target);
    camera.lookAt(target);
    const persp = camera as THREE.PerspectiveCamera;
    if (Math.abs(persp.fov - c.fovDeg) > 0.01) {
      persp.fov = c.fovDeg;
      persp.updateProjectionMatrix();
    }
  });
  useEffect(() => {
    start.current = null;
  }, [from, to]);
  return null;
}

function FpsMeter({ onFps }: { onFps?: (fps: number) => void }) {
  const frames = useRef(0);
  const last = useRef(0);
  useFrame(() => {
    frames.current++;
    const now = Date.now();
    if (!last.current) last.current = now;
    if (now - last.current >= 1000) {
      onFps?.((frames.current * 1000) / (now - last.current));
      frames.current = 0;
      last.current = now;
    }
  });
  return null;
}

/** The machine, its animations and the street around it, in the machine's local frame. */
function World(props: MachineSceneProps) {
  const {
    typeId,
    accent,
    slots,
    palette,
    heading,
    broken,
    selectedSlot,
    onSlotPress,
    crowd = 0.5,
    traffic = 0.5,
    leftHandTraffic = false,
    seed = 1,
    restockEvent,
    saleEvent,
    collectEvent,
    onPickup,
    onStats,
  } = props;
  const type = getMachineType(typeId);
  const scene = useThree((s) => s.scene);
  const world = useMemo(() => {
    const model = createVendingMachine({
      accent,
      dims: type.dims,
      rows: type.grid.rows,
      cols: type.grid.cols,
    });
    trimShadowCasters(model);
    const mirror = createMachineMirror(model);
    const fx = createMachineFx(model);
    model.group.add(fx.group);
    const street = createStreetScene({
      dims: type.dims,
      seed,
      leftHandTraffic,
      reflect: [mirror.group],
    });
    return { model, mirror, fx, street };
  }, [accent, type, seed, leftHandTraffic]);
  useEffect(
    () => () => {
      world.street.dispose();
      world.fx.dispose();
    },
    [world],
  );

  const glow = palette.machineEmissive;
  const night = Math.min(1, Math.max(0, (glow - 0.05) / 0.95));
  useEffect(() => {
    setMachineGlow(world.model, broken ? glow * 0.25 : glow);
    world.street.setPalette(palette, night);
  }, [world, palette, glow, night, broken]);
  useEffect(() => {
    world.model.slots.forEach((mesh, i) => {
      const s = slots[i];
      const visible = !!s && !!s.color && s.fill > 0;
      mesh.visible = visible;
      if (!visible || !s?.color) return;
      (mesh.material as THREE.MeshStandardMaterial).color.set(s.color);
      mesh.scale.set(1, 0.35 + 0.65 * Math.min(1, s.fill), 1);
    });
  }, [world, slots]);
  useEffect(() => world.fx.setBroken(!!broken), [world, broken]);
  useEffect(() => world.fx.setSelected(selectedSlot ?? null), [world, selectedSlot]);
  useEffect(() => {
    if (restockEvent) world.fx.restock(restockEvent.slots, Date.now());
  }, [world, restockEvent]);
  useEffect(() => {
    if (!saleEvent) return;
    const now = Date.now();
    saleEvent.slots.forEach((slot, i) => {
      const color = world.fx.sale(slot, now + i * 280);
      if (color && i === 0 && world.street.offerProduct(color, lifeSeconds(now))) onPickup?.();
    });
    // onPickup is a callback; only a new sale event should replay this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, saleEvent]);
  useEffect(() => {
    if (collectEvent) world.fx.collect(Date.now());
  }, [world, collectEvent]);

  const density = useMemo(() => ({ crowd: 0, traffic: 0, night: 0 }), []);
  useEffect(() => {
    density.crowd = crowd;
    density.traffic = traffic;
    density.night = night;
  }, [density, crowd, traffic, night]);
  const lastStats = useRef(0);
  useFrame(() => {
    const now = Date.now();
    world.fx.update(now, glow);
    world.street.update(lifeSeconds(now), density);
    world.mirror.sync();
    if (onStats && now - lastStats.current > 1000) {
      lastStats.current = now;
      const s = world.street.stats();
      onStats({ walkers: s.walkers, cars: s.cars, triangles: countSceneTriangles(scene) });
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    const name = e.object.name;
    if (!name.startsWith('slot-')) return;
    e.stopPropagation();
    const [, r, c] = name.split('-').map(Number);
    onSlotPress?.(r * type.grid.cols + c);
  };
  return (
    <group rotation={[0, headingToRotationY(heading), 0]}>
      <primitive object={world.street.root} />
      <primitive object={world.model.group} onClick={onClick} />
    </group>
  );
}

function Lights({ sun, palette }: { sun: SunState; palette: Palette }) {
  const l = sceneLighting(sun, palette);
  const dir = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const d = dir.current;
    if (!d) return;
    d.shadow.mapSize.set(1024, 1024);
    d.shadow.camera.left = -5;
    d.shadow.camera.right = 5;
    d.shadow.camera.top = 5;
    d.shadow.camera.bottom = -5;
    d.shadow.camera.far = 30;
    d.shadow.camera.updateProjectionMatrix();
    d.shadow.bias = -0.0005;
    d.shadow.normalBias = 0.02;
  }, []);
  return (
    <>
      <color attach="background" args={[l.skyColor]} />
      <hemisphereLight args={[l.skyColor, l.groundColor, l.ambientIntensity]} />
      <directionalLight
        ref={dir}
        castShadow
        color={l.sunColor}
        intensity={l.sunIntensity}
        position={[l.sunDirection[0] * 10, l.sunDirection[1] * 10, l.sunDirection[2] * 10]}
      />
      {/* Product lighting spilling onto the sidewalk after dusk (no shadows). It sits
          inside the cabinet so a customer standing at the glass isn't blown out. */}
      <pointLight
        position={[0, 1.15, 0]}
        color="#FFE9C7"
        intensity={l.glowLightIntensity}
        distance={5}
        decay={2}
      />
    </>
  );
}

export function MachineScene(props: MachineSceneProps) {
  // Mutable orbit state shared by the gesture (JS thread) and the camera rig (frame loop).
  const orbit = useMemo<OrbitState>(() => ({ target: 0, current: 0, start: 0 }), []);
  // Keeps an orbit drag that starts on a slot from also selecting it (see tapGate.ts).
  const gate = useMemo(() => createTapGate(), []);
  const onSlotPress = props.onSlotPress;
  const gatedSlotPress = useCallback(
    (i: number) => gateClick(gate, () => onSlotPress?.(i), Date.now()),
    [gate, onSlotPress],
  );
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .enabled(props.orbit !== false)
        // Horizontal drags orbit; taps and vertical scrolls pass through.
        .activeOffsetX([-12, 12])
        .failOffsetY([-12, 12])
        .onBegin(() => gateBegin(gate))
        .onStart(() => {
          gateActivate(gate);
          orbit.start = orbit.target;
        })
        .onUpdate((e) => {
          orbit.target = dragOrbit(orbit.start, e.translationX);
        })
        .onFinalize(() => gateFinalize(gate, Date.now())),
    [gate, orbit, props.orbit],
  );
  return (
    <GestureDetector gesture={pan}>
      <View style={{ flex: 1 }} collapsable={false}>
        <Canvas
          shadows
          camera={{ fov: props.to.fovDeg, near: 0.1, far: 4000, position: props.from.position }}
          gl={{ antialias: true }}
          onCreated={() => props.onReady?.()}
          style={{ flex: 1 }}
        >
          <Lights sun={props.sun} palette={props.palette} />
          <World {...props} onSlotPress={gatedSlotPress} />
          <CameraRig from={props.from} to={props.to} durationMs={props.durationMs} orbit={orbit} />
          <FpsMeter onFps={props.onFps} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}
