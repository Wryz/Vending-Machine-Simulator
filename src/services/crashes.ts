import * as Sentry from '@sentry/react-native';

import { ENV } from '@/data/env';
import { useProfile } from '@/store/profile';

/**
 * Crash reports (Sentry). Off until a DSN is set at build time
 * (EXPO_PUBLIC_SENTRY_DSN), and never in development. Privacy (SPEC §6.6):
 * no user, no IP, no screenshots; URLs lose their query strings (the area
 * check sends coarse coordinates there), and nothing is sent when the player
 * turned analytics off in Settings.
 */
let started = false;

export function initCrashReports(): void {
  if (started || !ENV.sentryDsn || __DEV__) return;
  started = true;
  Sentry.init({
    dsn: ENV.sentryDsn,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      const { loaded, settings } = useProfile.getState();
      if (loaded && !settings.analytics) return null;
      delete event.user;
      if (event.request?.url) event.request.url = stripQuery(event.request.url);
      return event;
    },
    beforeBreadcrumb(crumb) {
      if (crumb.category === 'console') return null;
      const url = crumb.data?.url;
      if (typeof url === 'string') crumb.data = { ...crumb.data, url: stripQuery(url) };
      return crumb;
    },
  });
}

function stripQuery(url: string): string {
  const i = url.search(/[?#]/);
  return i < 0 ? url : url.slice(0, i);
}

/** Wraps the root component so render errors are reported (a no-op without a DSN). */
export function withCrashReports(C: () => React.JSX.Element): React.ComponentType {
  return ENV.sentryDsn && !__DEV__ ? Sentry.wrap(C) : C;
}
