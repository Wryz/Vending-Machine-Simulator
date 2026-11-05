import { ENV } from '@/data/env';
import { useProfile } from '@/store/profile';

/**
 * Privacy-light analytics (SPEC §7.1): event names and small counts only,
 * keyed by a random install id. Never location, never names of places.
 * Batches to PostHog's capture API when a key is configured; otherwise no-op.
 */
type Props = Record<string, string | number | boolean>;

const queue: { event: string; properties: Props; timestamp: string }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const ALLOWED_KEYS =
  /^(placement|chapter|city|machines|kind|family|type|ok|count|product|tier|screen|minutes)$/;

export function track(event: string, props: Props = {}): void {
  const profile = useProfile.getState();
  if (!profile.settings.analytics || !ENV.posthogKey) return;
  const properties: Props = {};
  for (const [k, v] of Object.entries(props)) if (ALLOWED_KEYS.test(k)) properties[k] = v;
  queue.push({ event, properties, timestamp: new Date().toISOString() });
  if (!timer) timer = setTimeout(flush, 15_000);
}

export async function flush(): Promise<void> {
  timer = null;
  if (!queue.length || !ENV.posthogKey) return;
  const batch = queue.splice(0, queue.length);
  const distinct_id = useProfile.getState().installId;
  try {
    await fetch(`${ENV.posthogHost}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: ENV.posthogKey,
        batch: batch.map((b) => ({
          ...b,
          distinct_id,
          properties: { ...b.properties, $process_person_profile: false, $ip: null },
        })),
      }),
    });
  } catch {
    // Drop on failure; analytics must never affect play.
  }
}
