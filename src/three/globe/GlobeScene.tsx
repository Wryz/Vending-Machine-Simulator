'use no memo';
// three.js objects are mutated every frame; keep the React Compiler out of this file.
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber/native';
import { useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as THREE from 'three';

import { GLOBE } from '@/config/map';

import { createTapGate, gateActivate, gateBegin, gateClick, gateFinalize } from '../life/tapGate';

import { isLand, latLngToXYZ, subsolarPoint, xyzToLatLng, yawToFace } from './geo';

export interface GlobePin {
  id: string;
  lat: number;
  lng: number;
  /** The city being played: bigger, brand-colored. */
  current: boolean;
}

/** Mutable view state shared by the gestures (JS thread) and the frame loop. */
interface View3D {
  yaw: number;
  pitch: number;
  distance: number;
  pinchStart: number;
  panYaw: number;
  panPitch: number;
  touchedAt: number;
  /** A pinch already handed back to the map (fire once). */
  entered: boolean;
}

const DEG = Math.PI / 180;

/** Low-poly Earth: icosphere faces colored from the land mask, land raised a little. */
function buildEarth(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, GLOBE.detail);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = GLOBE.colors;
  const pal = {
    ocean: new THREE.Color(c.ocean),
    oceanDeep: new THREE.Color(c.oceanDeep),
    land: new THREE.Color(c.land),
    landAlt: new THREE.Color(c.landAlt),
    snow: new THREE.Color(c.snow),
  };
  const v = new THREE.Vector3();
  for (let f = 0; f < pos.count; f += 3) {
    let landVerts = 0;
    let latSum = 0;
    for (let k = 0; k < 3; k++) {
      v.fromBufferAttribute(pos, f + k);
      const { lat, lng } = xyzToLatLng(v.x, v.y, v.z);
      latSum += lat;
      const land = isLand(lat, lng);
      if (land) landVerts++;
      v.setLength(land ? 1 + GLOBE.landHeight : 1);
      pos.setXYZ(f + k, v.x, v.y, v.z);
    }
    const lat = latSum / 3;
    // A cheap stable hash per face for a little two-tone variety.
    const alt = ((f * 2654435761) >>> 0) % 3 === 0;
    const col =
      landVerts >= 2
        ? Math.abs(lat) > c.snowLatDeg
          ? pal.snow
          : alt
            ? pal.landAlt
            : pal.land
        : alt
          ? pal.oceanDeep
          : pal.ocean;
    for (let k = 0; k < 3; k++) col.toArray(colors, (f + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function Pin({ pin, onPress }: { pin: GlobePin; onPress: (id: string) => void }) {
  const { position, quaternion } = useMemo(() => {
    const [x, y, z] = latLngToXYZ(pin.lat, pin.lng);
    const normal = new THREE.Vector3(x, y, z);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return { position: normal.multiplyScalar(1 + GLOBE.landHeight), quaternion: q };
  }, [pin.lat, pin.lng]);
  const s = pin.current ? 1 : 0.7;
  const color = pin.current ? GLOBE.colors.pin : GLOBE.colors.pinOther;
  return (
    <group
      position={position}
      quaternion={quaternion}
      scale={s}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onPress(pin.id);
      }}
    >
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.12, 6]} />
        <meshLambertMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <icosahedronGeometry args={[0.045, 1]} />
        <meshLambertMaterial color={color} flatShading emissive={color} emissiveIntensity={0.35} />
      </mesh>
      {/* A generous invisible hit target so pins are easy to tap. */}
      <mesh position={[0, 0.12, 0]} visible={false}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

function Earth({
  pins,
  view,
  onPin,
}: {
  pins: GlobePin[];
  view: View3D;
  onPin: (id: string) => void;
}) {
  const geo = useMemo(() => buildEarth(), []);
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const sun = useMemo(() => {
    const p = subsolarPoint(new Date());
    return latLngToXYZ(p.lat, p.lng).map((n) => n * 6) as [number, number, number];
  }, []);
  const { camera } = useThree();

  useFrame((_, dt) => {
    if (Date.now() - view.touchedAt > GLOBE.idleAfterMs) view.yaw += GLOBE.idleSpinDegPerS * dt;
    if (outer.current) outer.current.rotation.x = view.pitch * DEG;
    if (inner.current) inner.current.rotation.y = view.yaw * DEG;
    camera.position.set(0, 0, view.distance);
    camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        {/* The sun turns with the Earth, so day and night stay on the right side. */}
        <directionalLight position={sun} intensity={2.4} color="#FFF6E4" />
        <mesh geometry={geo}>
          <meshLambertMaterial vertexColors flatShading />
        </mesh>
        {pins.map((p) => (
          <Pin key={p.id} pin={p} onPress={onPin} />
        ))}
      </group>
    </group>
  );
}

/**
 * Zoomed-out world view: a low-poly globe lit by the real sun, with a pin for
 * each city you play. Drag to spin, pinch in (or tap a pin) to go back down.
 */
export function GlobeScene({
  pins,
  focus,
  onPin,
  onEnter,
}: {
  pins: GlobePin[];
  /** Initially turned to face this point. */
  focus: { lat: number; lng: number };
  onPin: (id: string) => void;
  /** Pinched in far enough: go back to the map. */
  onEnter: () => void;
}) {
  const view = useMemo<View3D>(
    () => ({
      yaw: yawToFace(focus.lng),
      pitch: Math.max(-60, Math.min(60, focus.lat)),
      distance: GLOBE.cameraDistance,
      pinchStart: GLOBE.cameraDistance,
      panYaw: 0,
      panPitch: 0,
      touchedAt: Date.now(),
      entered: false,
    }),
    // Initial framing only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const gate = useMemo(() => createTapGate(), []);
  const gatedPin = useCallback(
    (id: string) => gateClick(gate, () => onPin(id), Date.now()),
    [gate, onPin],
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(8)
      .onBegin(() => {
        gateBegin(gate);
        view.touchedAt = Date.now();
      })
      .onStart(() => {
        gateActivate(gate);
        view.panYaw = view.yaw;
        view.panPitch = view.pitch;
      })
      .onUpdate((e) => {
        view.touchedAt = Date.now();
        view.yaw = view.panYaw + e.translationX * GLOBE.degPerPt;
        view.pitch = Math.max(-70, Math.min(70, view.panPitch + e.translationY * GLOBE.degPerPt));
      })
      .onFinalize(() => gateFinalize(gate, Date.now()));
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        view.pinchStart = view.distance;
        view.touchedAt = Date.now();
      })
      .onUpdate((e) => {
        view.touchedAt = Date.now();
        view.distance = Math.max(
          GLOBE.minDistance,
          Math.min(GLOBE.maxDistance, view.pinchStart / e.scale),
        );
        if (e.scale > GLOBE.enterScale && !view.entered) {
          view.entered = true;
          onEnter();
        }
      });
    return Gesture.Simultaneous(pan, pinch);
  }, [gate, view, onEnter]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }} collapsable={false}>
        <Canvas
          camera={{ fov: 40, near: 0.1, far: 50, position: [0, 0, GLOBE.cameraDistance] }}
          gl={{ antialias: true }}
          style={{ flex: 1 }}
        >
          <color attach="background" args={[GLOBE.colors.space]} />
          <ambientLight color={GLOBE.colors.ambient} intensity={1.1} />
          <Earth pins={pins} view={view} onPin={gatedPin} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}
