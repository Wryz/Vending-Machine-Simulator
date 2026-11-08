'use no memo';
// The view lives in refs (mutated on every touch); keep the React Compiler out.
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { GLOBE } from '@/config/map';
import { PICKER } from '@/config/picker';
import { useT } from '@/i18n';
import { yawToFace } from '@/three/globe/geo';
import {
  clampPitch,
  dotAt,
  easeInOut,
  flyTarget,
  globeRadius,
  viewCenter,
  type PickerView,
} from '@/three/globe/pickerView';

import { GlobeLabels, type GlobeLabelItem } from './GlobeLabels';
import { GlobeScene, type SceneLayout } from './GlobeScene';

export { viewCenter };

export interface GlobeDot {
  id: string;
  lat: number;
  lng: number;
  /** The selected city: bigger and in brand orange. */
  selected?: boolean;
  /** You (your approximate location): a blue dot. */
  you?: boolean;
}

/**
 * The picker's globe: a smooth, GPU-drawn Earth (three.js through R3F, see
 * GlobeScene), always lit for daytime, steered by the player: drag to turn
 * it, pinch to zoom, tap a pin, and it flies to a city when the strip asks.
 * Whatever is under the middle is reported through `onCenter` (the crosshair
 * is drawn on top by CityPicker).
 *
 * No React render while dragging: gestures write the view to a ref (read by
 * the GL frame) and wake the labels (redrawn at most once per frame);
 * `onCenter` is coalesced to one call per animation frame.
 */
export function PickerGlobe({
  width,
  height,
  cy,
  dots,
  flyTo,
  onCenter,
  onDot,
  onZoom,
}: {
  width: number;
  height: number;
  /** Vertical center of the globe on screen (room for the strip below). */
  cy: number;
  dots: GlobeDot[];
  /** Fly here when `key` changes (a card tap, "locate me"). */
  flyTo: { lat: number; lng: number; zoom?: number; key: number };
  onCenter: (p: { lat: number; lng: number }, settled: boolean) => void;
  onDot: (id: string) => void;
  /** The zoom after a gesture ends (the world view drops back to the map when pinched in). */
  onZoom?: (zoom: number) => void;
}) {
  const t = useT();
  const [initial] = useState<PickerView>(() => ({
    yaw: yawToFace(flyTo.lng),
    pitch: clampPitch(flyTo.lat),
    zoom: flyTo.zoom ?? 1,
  }));
  /** The current view, read by the GL frame. */
  const view = useRef<PickerView>({ ...initial });
  // Label layer listeners (GlobeLabels subscribes; called on every view change).
  const listeners = useRef(new Set<() => void>());
  const subscribe = useRef((fn: () => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  });
  const layout = useRef<SceneLayout>({ width, height, cy });
  const invalidate = useRef<(() => void) | null>(null);
  // Mutable state for gestures and the fly-to animation (read only in callbacks).
  const live = useRef({
    startYaw: 0,
    startPitch: 0,
    startZoom: 1,
    anim: 0,
    /** The pending coalesced onCenter (requestAnimationFrame id), 0 when none. */
    frame: 0,
  });
  const onCenterRef = useRef(onCenter);
  const onDotRef = useRef(onDot);
  const dotsRef = useRef(dots);
  const onZoomRef = useRef(onZoom);
  useEffect(() => {
    onCenterRef.current = onCenter;
    onDotRef.current = onDot;
    dotsRef.current = dots;
    onZoomRef.current = onZoom;
    layout.current = { width, height, cy };
    invalidate.current?.();
  }, [onCenter, onDot, onZoom, dots, width, height, cy]);

  // Show a view: the GL redraw and the labels follow on their next frame.
  const show = useRef((v: PickerView) => {
    view.current = { yaw: v.yaw, pitch: v.pitch, zoom: v.zoom };
    listeners.current.forEach((f) => f());
    invalidate.current?.();
  });
  const apply = useRef((v: PickerView, settled: boolean) => {
    const l = live.current;
    if (l.frame) {
      cancelAnimationFrame(l.frame);
      l.frame = 0;
    }
    show.current(v);
    onCenterRef.current(viewCenter(v), settled);
  });
  // Touch events can outpace the screen: report the center at most once per frame.
  const schedule = useRef((v: PickerView) => {
    show.current(v);
    const l = live.current;
    if (l.frame) return;
    l.frame = requestAnimationFrame(() => {
      l.frame = 0;
      onCenterRef.current(viewCenter(view.current), false);
    });
  });
  // A gesture ended: report the final view as settled.
  const settle = useRef(() => {
    apply.current(view.current, true);
    onZoomRef.current?.(view.current.zoom);
  });
  useEffect(() => {
    const l = live.current;
    return () => {
      if (l.frame) cancelAnimationFrame(l.frame);
      l.frame = 0;
    };
  }, []);

  // Fly to a city: ease yaw (the short way round), pitch and zoom together.
  useEffect(() => {
    const l = live.current;
    const from = { ...view.current };
    const to = flyTarget(from, flyTo);
    // The clock starts on the first frame.
    let start = -1;
    const anim = ++l.anim;
    const step = () => {
      if (anim !== live.current.anim) return;
      const now = Date.now();
      if (start < 0) start = now;
      const k = Math.min(1, (now - start) / PICKER.flyMs);
      const e = easeInOut(k);
      apply.current(
        {
          yaw: from.yaw + (to.yaw - from.yaw) * e,
          pitch: from.pitch + (to.pitch - from.pitch) * e,
          zoom: from.zoom + (to.zoom - from.zoom) * e,
        },
        k >= 1,
      );
      if (k < 1) frame = requestAnimationFrame(step);
    };
    let frame = requestAnimationFrame(step);
    // Unmounting (or a newer fly-to) stops this one.
    const cleanup = () => {
      cancelAnimationFrame(frame);
      if (anim === live.current.anim) live.current.anim++;
    };
    return cleanup;
    // Only a new fly-to request (its key) starts an animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo.key]);

  /* eslint-disable react-hooks/refs -- gesture callbacks run on touch events, after render, never during it */
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(3)
      .onStart(() => {
        const l = live.current;
        l.anim++;
        l.startYaw = view.current.yaw;
        l.startPitch = view.current.pitch;
      })
      .onUpdate((e) => {
        const l = live.current;
        const zoom = view.current.zoom;
        // Turn slower when zoomed in, so the spot under your finger stays put.
        const k = GLOBE.degPerPt / zoom;
        schedule.current({
          yaw: l.startYaw + e.translationX * k,
          pitch: clampPitch(l.startPitch + e.translationY * k),
          zoom,
        });
      })
      .onEnd(() => settle.current());
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        const l = live.current;
        l.anim++;
        l.startZoom = view.current.zoom;
      })
      .onUpdate((e) => {
        const l = live.current;
        schedule.current({
          yaw: view.current.yaw,
          pitch: view.current.pitch,
          zoom: Math.max(PICKER.minZoom, Math.min(PICKER.maxZoom, l.startZoom * e.scale)),
        });
      })
      .onEnd(() => settle.current());
    // A tap on a pin picks that city ("you" isn't a city).
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(10)
      .onEnd((e, ok) => {
        if (!ok) return;
        const v = view.current;
        const { width: w, height: h, cy: y } = layout.current;
        const hit = dotAt(
          dotsRef.current.filter((d) => !d.you),
          v,
          w / 2,
          y,
          globeRadius(w, h, v.zoom, PICKER.globe.scale),
          e.x,
          e.y,
          PICKER.globe.pinHitPt,
        );
        if (hit) onDotRef.current(hit.id);
      });
    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
  }, []);
  /* eslint-enable react-hooks/refs */

  const labels = useMemo(() => {
    const L = PICKER.labels;
    const out: GlobeLabelItem[] = [];
    L.oceans.forEach((a, i) =>
      out.push({
        key: `o${i}`,
        text: t(`picker.globe.oceans.${a.id}`).toUpperCase(),
        lat: a.lat,
        lng: a.lng,
        ocean: true,
      }),
    );
    L.continents.forEach((a, i) =>
      out.push({
        key: `c${i}`,
        text: t(`picker.globe.continents.${a.id}`).toUpperCase(),
        lat: a.lat,
        lng: a.lng,
        ocean: false,
      }),
    );
    return out;
  }, [t]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[StyleSheet.absoluteFill, styles.sky]} collapsable={false}>
        <View style={styles.gl} pointerEvents="none">
          <GlobeScene liveRef={view} layoutRef={layout} dots={dots} bridgeRef={invalidate} />
        </View>
        <GlobeLabels
          items={labels}
          viewRef={view}
          subscribeRef={subscribe}
          width={width}
          height={height}
          cy={cy}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  sky: { backgroundColor: GLOBE.colors.sky },
  gl: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 0 },
});
