import { useMemo, useRef } from 'react';
import { useWindowDimensions } from 'react-native';

import { GLOBE } from '@/config/map';
import { PickerGlobe, type GlobeDot } from '@/ui/picker/PickerGlobe';

export interface GlobePin {
  id: string;
  lat: number;
  lng: number;
  /** The city being played: bigger and brand-colored. */
  current: boolean;
  label?: string;
}

/**
 * Zoomed-out world view (SPEC §3.5): the same GPU globe as the city picker,
 * with a pin per city you play. Drag to spin; pinch in or tap your city's pin
 * to go back down to the map; tap another pin to go there.
 */
export function GlobeView({
  pins,
  focus,
  onPin,
  onEnter,
}: {
  pins: GlobePin[];
  focus: { lat: number; lng: number };
  onPin: (id: string) => void;
  onEnter: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const dots = useMemo<GlobeDot[]>(
    () => pins.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, selected: p.current })),
    [pins],
  );
  // Opens over the city you were in; flies nowhere else on its own.
  const flyTo = useMemo(
    () => ({ lat: focus.lat, lng: focus.lng, zoom: GLOBE.openZoom, key: 1 }),
    // The view only starts here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const entered = useRef(false);
  return (
    <PickerGlobe
      width={width}
      height={height}
      cy={height / 2}
      dots={dots}
      flyTo={flyTo}
      onCenter={() => undefined}
      onDot={onPin}
      onZoom={(zoom) => {
        if (zoom >= GLOBE.enterZoom && !entered.current) {
          entered.current = true;
          onEnter();
        }
      }}
    />
  );
}
