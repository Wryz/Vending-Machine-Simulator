/** Trusted time: the server's clock plus a monotonic timer, immune to phone clock changes. */
function load(serverIso: string | null) {
  jest.resetModules();
  const store: Record<string, unknown> = {};
  jest.doMock('./storage', () => ({
    readJson: (k: string) => store[k] ?? null,
    writeJson: (k: string, v: unknown) => {
      store[k] = v;
    },
  }));
  jest.doMock('@/data/env', () => ({ ENV: { dataApiUrl: 'https://api.test' } }));
  global.fetch = jest.fn(async () =>
    serverIso
      ? ({ ok: true, json: async () => ({ time: serverIso }) } as Response)
      : Promise.reject(new Error('offline')),
  ) as unknown as typeof fetch;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return { clock: require('./clock') as typeof import('./clock'), store };
}

describe('trusted clock', () => {
  const realNow = Date.now;
  afterEach(() => {
    Date.now = realNow;
  });

  it('follows the server and ignores the phone clock jumping forward', async () => {
    const server = Date.UTC(2026, 10, 8, 12);
    Date.now = () => server - 60_000; // phone a minute slow
    const { clock } = load(new Date(server).toISOString());
    expect(await clock.syncClock()).toBe(true);
    expect(clock.clockVerified()).toBe(true);
    Date.now = () => server + 72 * 3_600_000; // player sets the clock 3 days ahead
    expect(Math.abs(clock.trustedNow() - server)).toBeLessThan(5_000);
    expect(clock.aheadBy(server + 72 * 3_600_000)).toBeGreaterThan(71 * 3_600_000);
  });

  it('after the background, uses the last known difference until the next check', async () => {
    const server = Date.UTC(2026, 10, 8, 12);
    Date.now = () => server - 60_000;
    const { clock } = load(new Date(server).toISOString());
    await clock.syncClock();
    clock.dropClockAnchor();
    expect(clock.clockVerified()).toBe(false);
    Date.now = () => server - 60_000 + 10_000;
    expect(Math.abs(clock.trustedNow() - (server + 10_000))).toBeLessThan(5_000);
  });

  it('offline: the phone clock (no anchor, not verified)', async () => {
    const { clock } = load(null);
    expect(await clock.syncClock()).toBe(false);
    expect(clock.clockVerified()).toBe(false);
    expect(Math.abs(clock.trustedNow() - Date.now())).toBeLessThan(1_000);
  });
});
