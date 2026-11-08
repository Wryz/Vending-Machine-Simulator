'use no memo';
// three.js objects are mutated every frame; keep the React Compiler out of this file.
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';

import { GLOBE } from '@/config/map';
import { PICKER } from '@/config/picker';
import { latLngToXYZ } from '@/three/globe/geo';
import { globeRadius, lightDir, viewEuler, type PickerView } from '@/three/globe/pickerView';

import type { GlobeDot } from './PickerGlobe';

/**
 * The picker's Earth on the GPU: one textured sphere, a soft halo and the
 * pins as a single point cloud. The camera is orthographic (1 unit = 1 pt)
 * and never moves; each frame only the group's rotation, scale and position
 * change, so dragging costs the same whatever the texture or mesh detail.
 * Renders on demand: the parent calls `invalidate` when the view changes.
 */

const G = PICKER.globe;
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro bundles the image; expo-asset resolves it to a file.
const EARTH = require('../../../assets/globe/earth.jpg') as number;

/** '#RRGGBB' -> 0..1 RGB, raw (the shaders write colors as-is, no color management). */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// The texture outlives one Canvas: reopening the picker re-uploads it without reloading the file.
let earth: THREE.Texture | null = null;
let earthLoading = false;
const earthWaiters = new Set<(t: THREE.Texture) => void>();
/**
 * The Earth image, loaded once. We resolve the bundled file to a `file:` URL
 * with expo-asset ourselves: handing R3F's loader the module id worked in dev
 * (served by Metro) but never finished in release builds.
 */
function loadEarth(): void {
  if (earth || earthLoading) return;
  earthLoading = true;
  Asset.fromModule(EARTH)
    .downloadAsync()
    .then((a) => {
      const uri = a.localUri ?? a.uri;
      new THREE.TextureLoader().load(
        uri,
        (t) => {
          t.generateMipmaps = true;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.magFilter = THREE.LinearFilter;
          earth = t;
          earthWaiters.forEach((f) => f(t));
          earthWaiters.clear();
        },
        undefined,
        (e) => {
          earthLoading = false;
          console.warn('[globe] earth texture failed', uri, e);
        },
      );
    })
    .catch((e: unknown) => {
      earthLoading = false;
      console.warn('[globe] earth asset failed', e);
    });
}

const globeVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
void main() {
  vUv = uv;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const globeFrag = /* glsl */ `
uniform sampler2D uMap;
uniform float uReady;
uniform vec3 uOcean;
uniform vec3 uLight;
uniform float uAmbient;
uniform float uDiffuse;
uniform vec3 uRimColor;
uniform float uRim;
uniform float uRimPower;
varying vec2 vUv;
varying vec3 vN;
void main() {
  vec3 n = normalize(vN);
  vec3 c = mix(uOcean, texture2D(uMap, vUv).rgb, uReady);
  c *= uAmbient + uDiffuse * max(dot(n, uLight), 0.0);
  c = mix(c, uRimColor, uRim * pow(1.0 - max(n.z, 0.0), uRimPower));
  gl_FragColor = vec4(c, 1.0);
}`;

const haloVert = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const haloFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uInner;
uniform float uOpacity;
varying vec2 vP;
void main() {
  float d = length(vP);
  float a = uOpacity * (1.0 - smoothstep(uInner, 1.0, d));
  if (a <= 0.0) discard;
  gl_FragColor = vec4(uColor, a);
}`;

// Pins: screen-sized discs with a ring, faded out as they turn away.
const pinVert = /* glsl */ `
attribute vec3 aFill;
attribute vec3 aRing;
attribute vec3 aShape; // radius (pt), ring width (pt), opacity
uniform float uDpr;
uniform float uHide;
uniform float uFull;
varying vec3 vFill;
varying vec3 vRing;
varying vec3 vShape;
varying float vOuter;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 c = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float facing = normalize(mv.xyz - c).z;
  vAlpha = aShape.z * smoothstep(uHide, uFull, facing);
  vFill = aFill;
  vRing = aRing;
  vShape = aShape;
  vOuter = aShape.x + aShape.y * 0.5 + 1.0;
  gl_PointSize = vOuter * 2.0 * uDpr;
  gl_Position = vAlpha > 0.0 ? projectionMatrix * mv : vec4(2.0, 2.0, 2.0, 1.0);
}`;

const pinFrag = /* glsl */ `
uniform float uDpr;
varying vec3 vFill;
varying vec3 vRing;
varying vec3 vShape;
varying float vOuter;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0 * vOuter;
  float aa = 0.75 / uDpr;
  float outer = vShape.x + vShape.y * 0.5;
  float inner = vShape.x - vShape.y * 0.5;
  float a = 1.0 - smoothstep(outer - aa, outer + aa, d);
  if (a <= 0.0) discard;
  vec3 col = mix(vFill, vRing, smoothstep(inner - aa, inner + aa, d));
  gl_FragColor = vec4(col, a * vAlpha);
}`;

export interface SceneLayout {
  width: number;
  height: number;
  cy: number;
}

function Globe({
  liveRef,
  layoutRef,
  dots,
  bridgeRef,
}: {
  liveRef: RefObject<PickerView>;
  layoutRef: RefObject<SceneLayout>;
  dots: GlobeDot[];
  bridgeRef: RefObject<(() => void) | null>;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const dpr = useThree((s) => s.viewport.dpr);
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);

  useEffect(() => {
    bridgeRef.current = invalidate;
    // The picker may have flown to its city before the GL view was ready: draw the current view now.
    invalidate();
    return () => {
      bridgeRef.current = null;
    };
  }, [bridgeRef, invalidate]);

  const globeMat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      vertexShader: globeVert,
      fragmentShader: globeFrag,
      uniforms: {
        uMap: { value: earth },
        uReady: { value: earth ? 1 : 0 },
        uOcean: { value: new THREE.Vector3(...rgb(GLOBE.colors.ocean)) },
        uLight: { value: new THREE.Vector3(...lightDir(G.lightUpDeg, G.lightLeftDeg)) },
        uAmbient: { value: G.ambient },
        uDiffuse: { value: G.diffuse },
        uRimColor: { value: new THREE.Vector3(...rgb(GLOBE.colors.halo)) },
        uRim: { value: G.rim },
        uRimPower: { value: G.rimPower },
      },
    });
    return m;
  }, []);
  useEffect(() => {
    if (earth) return;
    const done = (t: THREE.Texture) => {
      globeMat.uniforms.uMap.value = t;
      globeMat.uniforms.uReady.value = 1;
      invalidate();
    };
    earthWaiters.add(done);
    loadEarth();
    return () => {
      earthWaiters.delete(done);
    };
  }, [globeMat, invalidate]);

  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: haloVert,
        fragmentShader: haloFrag,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Vector3(...rgb(GLOBE.colors.halo)) },
          uInner: { value: G.haloInner },
          uOpacity: { value: G.haloOpacity },
        },
      }),
    [],
  );

  const pinMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pinVert,
        fragmentShader: pinFrag,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uDpr: { value: dpr },
          uHide: { value: G.pinHideFacing },
          uFull: { value: G.pinFullFacing },
        },
      }),
    [dpr],
  );

  // Pins only change when the list does; selected and "you" go last so they draw on top.
  const pinGeo = useMemo(() => {
    const list = [...dots].sort(
      (a, b) => Number(!!a.selected || !!a.you) - Number(!!b.selected || !!b.you),
    );
    const n = list.length;
    const pos = new Float32Array(n * 3);
    const fill = new Float32Array(n * 3);
    const ring = new Float32Array(n * 3);
    const shape = new Float32Array(n * 3);
    const c = GLOBE.colors;
    list.forEach((d, i) => {
      const [x, y, z] = latLngToXYZ(d.lat, d.lng);
      const k = 1 + G.pinLift;
      pos.set([x * k, y * k, z * k], i * 3);
      const kind = d.you ? G.pins.you : d.selected ? G.pins.selected : G.pins.other;
      fill.set(rgb(d.you ? c.you : d.selected ? c.pin : c.pinOther), i * 3);
      ring.set(rgb(d.you || d.selected ? c.pinRing : c.pin), i * 3);
      shape.set([kind.r, kind.stroke, kind.alpha], i * 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aFill', new THREE.BufferAttribute(fill, 3));
    g.setAttribute('aRing', new THREE.BufferAttribute(ring, 3));
    g.setAttribute('aShape', new THREE.BufferAttribute(shape, 3));
    return g;
  }, [dots]);
  useEffect(() => {
    invalidate();
    return () => pinGeo.dispose();
  }, [pinGeo, invalidate]);

  useEffect(
    () => () => {
      globeMat.dispose();
      haloMat.dispose();
      pinMat.dispose();
    },
    [globeMat, haloMat, pinMat],
  );

  // The only per-frame work: place the group from the live view.
  useFrame(() => {
    const g = group.current;
    const h = halo.current;
    const v = liveRef.current;
    const l = layoutRef.current;
    if (!g || !h) return;
    const r = globeRadius(l.width, l.height, v.zoom, G.scale);
    const [ex, ey, ez] = viewEuler(v);
    g.rotation.set(ex, ey, ez, 'XYZ');
    g.scale.setScalar(r);
    g.position.set(0, l.height / 2 - l.cy, 0);
    h.scale.setScalar(r * G.haloScale);
    // Behind the whole sphere, so the globe hides its middle.
    h.position.set(0, l.height / 2 - l.cy, -r * 1.05);
  });

  return (
    <>
      <mesh ref={halo} material={haloMat}>
        <circleGeometry args={[1, 96]} />
      </mesh>
      <group ref={group}>
        <mesh material={globeMat}>
          <sphereGeometry args={[1, G.widthSegments, G.heightSegments, -Math.PI / 2]} />
        </mesh>
        <points geometry={pinGeo} material={pinMat} frustumCulled={false} renderOrder={2} />
      </group>
    </>
  );
}

/** The GL canvas (transparent: the sky color is the view behind it). */
export function GlobeScene(props: {
  liveRef: RefObject<PickerView>;
  layoutRef: RefObject<SceneLayout>;
  dots: GlobeDot[];
  bridgeRef: RefObject<(() => void) | null>;
}) {
  // Touches go to the picker's gesture handler (pan, pinch, tap with its own pin hit test):
  // R3F's canvas would otherwise claim them for its own pointer events.
  return (
    <View pointerEvents="none" style={{ flex: 1 }}>
      <Canvas
        orthographic
        frameloop="demand"
        linear
        flat
        camera={{ position: [0, 0, 4000], near: 1, far: 8000, zoom: 1 }}
        gl={{ antialias: true }}
        style={{ flex: 1 }}
      >
        <Globe {...props} />
      </Canvas>
    </View>
  );
}
