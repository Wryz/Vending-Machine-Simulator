'use no memo';
// three.js objects are mutated every frame; keep the React Compiler out of this file.
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { getMachineType, type MachineTypeId } from '@/config/machines';
import type { Palette } from '@/config/timeOfDay';
import { blendSceneCameras, headingToRotationY, type SceneCamera } from '@/map/cameraMatch';
import type { SunState } from '@/map/sun';

import { sceneLighting } from './lightingRig';
import { createVendingMachine, setMachineGlow } from './models/vendingMachine';

/**
 * R3F close-up scene (SPEC §7.3): one low-poly machine on a sidewalk, lit by
 * the city's real sun; fronts glow after dusk. Budget: ~30K tris, at most 2
 * shadow-casting lights (we use 1).
 */
export interface SlotView {
  color: string | null;
  /** 0..1 fill level; 0 hides the product block. */
  fill: number;
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
}

function CameraRig({
  from,
  to,
  durationMs,
}: {
  from: SceneCamera;
  to: SceneCamera;
  durationMs: number;
}) {
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const now = Date.now();
    start.current ??= now;
    const t = durationMs > 0 ? (now - start.current) / durationMs : 1;
    const c = blendSceneCameras(from, to, t);
    camera.position.set(...c.position);
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

function Machine({
  typeId,
  accent,
  slots,
  palette,
  heading,
  broken,
  selectedSlot,
  onSlotPress,
}: Omit<MachineSceneProps, 'from' | 'to' | 'durationMs' | 'sun'>) {
  const type = getMachineType(typeId);
  const model = useMemo(
    () =>
      createVendingMachine({ accent, dims: type.dims, rows: type.grid.rows, cols: type.grid.cols }),
    [accent, type],
  );
  useEffect(() => {
    setMachineGlow(model, broken ? palette.machineEmissive * 0.25 : palette.machineEmissive);
  }, [model, palette.machineEmissive, broken]);
  useEffect(() => {
    model.slots.forEach((mesh, i) => {
      const s = slots[i];
      const visible = !!s && !!s.color && s.fill > 0;
      mesh.visible = visible;
      if (!visible || !s?.color) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.set(s.color);
      mat.emissive.set(i === selectedSlot ? '#D9932B' : '#000000');
      mat.emissiveIntensity = i === selectedSlot ? 0.6 : 0;
      mesh.scale.set(1, 0.35 + 0.65 * Math.min(1, s.fill), 1);
    });
  }, [model, slots, selectedSlot]);
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    const name = e.object.name;
    if (!name.startsWith('slot-')) return;
    e.stopPropagation();
    const [, r, c] = name.split('-').map(Number);
    onSlotPress?.(r * type.grid.cols + c);
  };
  return (
    <primitive
      object={model.group}
      rotation={[0, headingToRotationY(heading), 0]}
      onClick={onClick}
    />
  );
}

function Ground({ palette, heading }: { palette: Palette; heading: number }) {
  return (
    <group rotation={[0, headingToRotationY(heading), 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={palette.road} roughness={0.95} flatShading />
      </mesh>
      {/* Sidewalk slab and curb in front of the machine. */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[8, 0.12, 4]} />
        <meshStandardMaterial color={palette.building} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 1.6, -0.75]} receiveShadow castShadow>
        <boxGeometry args={[8, 3.2, 0.3]} />
        <meshStandardMaterial color={palette.land} roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}

function Lights({ sun, palette, heading }: { sun: SunState; palette: Palette; heading: number }) {
  const l = sceneLighting(sun, palette);
  const dir = useRef<THREE.DirectionalLight>(null);
  const front = useMemo(() => {
    const b = (heading * Math.PI) / 180;
    return [Math.sin(b) * 1.2, 1.2, -Math.cos(b) * 1.2] as [number, number, number];
  }, [heading]);
  useEffect(() => {
    const d = dir.current;
    if (!d) return;
    d.shadow.mapSize.set(1024, 1024);
    d.shadow.camera.left = -4;
    d.shadow.camera.right = 4;
    d.shadow.camera.top = 4;
    d.shadow.camera.bottom = -4;
    d.shadow.bias = -0.0005;
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
      {/* Product lighting spilling onto the sidewalk after dusk (no shadows). */}
      <pointLight
        position={front}
        color="#FFE9C7"
        intensity={l.glowLightIntensity}
        distance={4}
        decay={2}
      />
    </>
  );
}

export function MachineScene(props: MachineSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ fov: props.to.fovDeg, near: 0.1, far: 4000, position: props.from.position }}
      gl={{ antialias: true }}
      onCreated={() => props.onReady?.()}
      style={{ flex: 1 }}
    >
      <Lights sun={props.sun} palette={props.palette} heading={props.heading} />
      <Ground palette={props.palette} heading={props.heading} />
      <Machine {...props} />
      <CameraRig from={props.from} to={props.to} durationMs={props.durationMs} />
      <FpsMeter onFps={props.onFps} />
    </Canvas>
  );
}
