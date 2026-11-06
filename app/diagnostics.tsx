import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { CLOSEUP_CAMERA, FAMILY_ACCENT, SNACK_MACHINE_DIMENSIONS } from '@/config/machines';
import { loadCityPack } from '@/data/cityPack';
import { cellOf, neighbors } from '@/data/h3';
import { WeatherBook } from '@/data/weather';
import { ENV } from '@/data/env';
import { closeupCamera } from '@/map/cameraMatch';
import { tileSourceFor } from '@/map/tiles';
import { getTimeOfDay } from '@/map/timeOfDay';
import {
  advance,
  cloneState,
  newGame,
  placeMachine,
  restockMachine,
  suggestRestock,
  type GameState,
  type World,
} from '@/sim';
import { offsetPoint } from '@/sim/geo';
import { writeJson } from '@/services/storage';
import { buildWorld, cityInfoFor, useGame } from '@/store/game';
import { MachineScene, type SceneStats } from '@/three/MachineScene';
import { Button, Mono, Paper, Screen, Section, T } from '@/ui/kit';

/**
 * Developer diagnostics for the Milestone-1 spikes, run on a real device:
 * h3-js on Hermes, 72 h offline catch-up timing, 3D close-up fps, tile route.
 * Reachable from Settings (long-press the version) — not part of play.
 *
 * `coinline://diagnostics?run=all` runs every check unattended (h3, both
 * catch-ups, then ~15 s of the busy 3D scene) and also prints each result as a
 * `[diag]` line to the JS console, so QA can collect numbers from the Metro log
 * on a Simulator or device without tapping.
 */
const AUTO_FPS_SAMPLES = 12;

/** The open city, or a throwaway New York bench world that never touches a save. */
async function benchState(): Promise<{ game: GameState; world: World }> {
  const { game, world } = useGame.getState();
  if (game && world) return { game, world };
  const city = cityInfoFor('new-york');
  const bench = buildWorld(city, await loadCityPack(city.id), new WeatherBook());
  return { game: newGame({ cityId: city.id, now: Date.now(), seed: 1 }), world: bench };
}

/** This session's auto-run log (see `log`). */
const autoLog: string[] = [];

export default function Diagnostics() {
  const [lines, setLines] = useState<string[]>([]);
  const [fps, setFps] = useState<number[]>([]);
  const [show3d, setShow3d] = useState(false);
  const [busy, setBusy] = useState(true);
  const [stats, setStats] = useState<SceneStats | null>(null);
  const { run } = useLocalSearchParams<{ run?: string }>();
  const auto = useRef<'idle' | 'fps' | 'done'>('idle');
  const log = (s: string) => {
    console.log(`[diag] ${s}`);
    setLines((l) => [...l, s]);
    // Auto runs also keep the log on disk, so a Release build's numbers can be read off the device.
    if (run === 'all') {
      autoLog.push(`${new Date().toISOString()} ${s}`);
      writeJson('diagnostics-log', autoLog);
    }
  };

  const runH3 = () => {
    try {
      const t0 = performance.now();
      const id = cellOf(40.7128, -74.006);
      let n = 0;
      for (let i = 0; i < 2000; i++)
        n += neighbors(cellOf(40.7 + i * 1e-4, -74 + i * 1e-4), 1).length;
      const ms = performance.now() - t0;
      log(`h3: ${id} OK, 2000× latLngToCell+gridDisk = ${ms.toFixed(1)} ms (${n} cells)`);
    } catch (e) {
      log(`h3: FAILED ${String(e)}`);
    }
    log(
      `engine: ${typeof (globalThis as { HermesInternal?: unknown }).HermesInternal === 'object' ? 'Hermes' : 'other'}`,
    );
  };

  const runOffline = async (count: number) => {
    const { game, world } = await benchState();
    let s = cloneState(game);
    s.chapter = 5;
    s.cashCents = 1e12;
    const center = world.city;
    for (let i = 0; i < count; i++) {
      const p = offsetPoint(center, (i * 37) % 360, 40 + (i % 40) * 25);
      const r = placeMachine(s, world, {
        typeId: 'snack',
        lat: p.lat,
        lng: p.lng,
        heading: 0,
        termDays: 180,
        exclusive: false,
      });
      if (r.ok)
        restockMachine(s, world, r.machine.id, suggestRestock(s, r.machine.id, 10_000), {
          manual: false,
          capacity: 10_000,
        });
    }
    s = cloneState(s);
    const t0 = performance.now();
    advance(s, world, s.now + 72 * 3_600_000);
    log(
      `offline 72 h × ${s.machines.filter((m) => m.status === 'active').length} machines: ${(performance.now() - t0).toFixed(0)} ms (target < 300 ms)`,
    );
  };

  useEffect(() => {
    if (run !== 'all' || auto.current !== 'idle') return;
    auto.current = 'fps';
    (async () => {
      runH3();
      // Let the log render between the long synchronous runs.
      await new Promise((r) => setTimeout(r, 300));
      await runOffline(15);
      await new Promise((r) => setTimeout(r, 300));
      await runOffline(200);
      setBusy(true);
      setShow3d(true);
    })().catch((e) => log(`auto: FAILED ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per open
  }, [run]);

  useEffect(() => {
    if (auto.current !== 'fps' || fps.length < AUTO_FPS_SAMPLES) return;
    auto.current = 'done';
    const last = fps.slice(-10);
    log(
      `3D fps (busy street): avg ${(last.reduce((a, b) => a + b, 0) / last.length).toFixed(1)}, min ${Math.min(...last).toFixed(1)} over the last ${last.length} s` +
        (stats ? ` · walkers ${stats.walkers} · ${stats.triangles} tris` : ''),
    );
    log('auto: done');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once
  }, [fps]);

  const tod = getTimeOfDay(new Date(), 40.7128, -74.006);
  const to = closeupCamera(180, SNACK_MACHINE_DIMENSIONS.heightM, CLOSEUP_CAMERA);
  const avg = fps.length ? fps.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, fps.length) : 0;
  const city = useGame.getState().city;

  return (
    <Screen title="Diagnostics" subtitle={`${Constants.expoConfig?.version ?? ''} · spikes`}>
      <Section title="Data">
        <Button label="h3-js on this engine" kind="secondary" onPress={runH3} />
        <Button
          label="Offline catch-up: 15 machines"
          kind="secondary"
          onPress={() => runOffline(15)}
        />
        <Button
          label="Offline catch-up: 200 machines"
          kind="secondary"
          onPress={() => runOffline(200)}
        />
        <T
          size={12}
          muted
        >{`Tiles: ${JSON.stringify(tileSourceFor(city?.id ?? 'new-york'))} · API: ${ENV.dataApiUrl || 'not set'}`}</T>
      </Section>
      <Section title="3D close-up">
        <Button
          label={show3d ? 'Hide scene' : 'Show scene and measure fps'}
          kind="secondary"
          onPress={() => setShow3d((v) => !v)}
        />
        <Button
          label={busy ? 'Street: busy (worst case)' : 'Street: quiet night'}
          kind="secondary"
          onPress={() => setBusy((v) => !v)}
        />
        {show3d ? (
          <View style={{ height: 360 }}>
            <MachineScene
              typeId="snack"
              accent={FAMILY_ACCENT.snacks}
              slots={Array.from({ length: 30 }, (_, i) => ({
                color: ['#C9473A', '#E0B341', '#3E6FB0'][i % 3],
                fill: 1,
              }))}
              sun={tod.sun}
              palette={tod.palette}
              heading={180}
              from={to}
              to={to}
              durationMs={0}
              crowd={busy ? 1 : 0.15}
              onFps={(f) => setFps((x) => [...x.slice(-59), f])}
              onStats={setStats}
            />
          </View>
        ) : null}
        <Mono>{`fps: ${avg ? avg.toFixed(1) : '—'} (avg of last ${Math.min(10, fps.length)} s)`}</Mono>
        <Mono>
          {stats
            ? `walkers ${stats.walkers} · ${stats.triangles.toLocaleString()} tris (budget 30,000)`
            : 'walkers — · tris —'}
        </Mono>
      </Section>
      <Paper>
        {lines.length === 0 ? <T muted>Run a check above.</T> : null}
        {lines.map((l, i) => (
          <Mono key={i} size={12}>
            {l}
          </Mono>
        ))}
      </Paper>
    </Screen>
  );
}
