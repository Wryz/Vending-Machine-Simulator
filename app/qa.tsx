import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import type { CityId } from '@/config/cities';
import { CONTRACT } from '@/config/economy';
import { placeMachine, restockMachine, suggestRestock } from '@/sim';
import { offsetPoint } from '@/sim/geo';
import { cityInfoFor, useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { Mono } from '@/ui/kit';

/**
 * Dev builds only: seed a playable state for unattended QA and screenshots,
 * e.g. `EXPO_PUBLIC_QA_ROUTE='/qa?city=new-york&machines=1' npm start`.
 * Opens a fresh game, places and stocks the starter machine (and, with
 * `machines`, more), then lands on the map. Never reachable in release.
 */
export default function Qa() {
  const { city = 'new-york', to = '/map' } = useLocalSearchParams<{ city?: string; to?: string }>();
  const [note, setNote] = useState('Seeding…');

  useEffect(() => {
    if (!__DEV__) return;
    (async () => {
      const info = cityInfoFor(city as CityId);
      await useGame.getState().openCity(info, { fresh: true, seed: 7 });
      if (!useGame.getState().world) return setNote(`Could not open ${city}.`);
      useGame.getState().act((d, world) => {
        const stored = d.machines.find((m) => m.status === 'stored');
        if (!stored) return { ok: false };
        // Walk outward from the city centre until a placement is accepted.
        for (let i = 0; i < 60; i++) {
          const p = offsetPoint(world.city, (i * 47) % 360, 60 + i * 20);
          const r = placeMachine(d, world, {
            machineId: stored.id,
            lat: p.lat,
            lng: p.lng,
            heading: 180,
            termDays: CONTRACT.termsDays[0],
            exclusive: false,
          });
          if (r.ok) {
            restockMachine(d, world, r.machine.id, suggestRestock(d, r.machine.id, 10_000), {
              manual: true,
              capacity: 10_000,
            });
            return { ok: true };
          }
        }
        return { ok: false };
      });
      useProfile.getState().update((p) => {
        p.onboarded = true;
      });
      router.replace(to as never);
    })().catch((e) => setNote(`QA seed failed: ${String(e)}`));
  }, [city, to]);

  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Mono>{note}</Mono>
    </View>
  );
}
