/**
 * The Game Center service with the native module mocked: silent when the
 * module is missing or the player isn't signed in; reports scores and
 * trophies once signed in.
 */
import type { GameState } from '@/sim';

type Listener = (s: unknown) => void;

function mockNativeModule(authenticated: boolean) {
  const listeners: Listener[] = [];
  return {
    listeners,
    isAuthenticated: jest.fn(() => authenticated),
    authenticate: jest.fn(async () => ({
      authenticated,
      canSignIn: !authenticated,
      displayName: 'P1',
    })),
    presentSignIn: jest.fn(async () => true),
    submitScore: jest.fn(async () => undefined),
    reportAchievements: jest.fn(async () => undefined),
    showDashboard: jest.fn(async () => true),
    addListener: jest.fn((_e: string, fn: Listener) => {
      listeners.push(fn);
      return { remove: () => undefined };
    }),
  };
}

function load(native: ReturnType<typeof mockNativeModule> | null, clockOk = true) {
  jest.resetModules();
  jest.doMock('./clock', () => ({ clockVerified: () => clockOk, aheadBy: () => 0 }));
  jest.doMock('react-native', () => ({
    Platform: { OS: 'ios' },
    AppState: { addEventListener: jest.fn() },
  }));
  jest.doMock('expo', () => ({ requireOptionalNativeModule: () => native }));
  jest.doMock('@/store/game', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { create } = require('zustand');
    return { useGame: create(() => ({ game: null })) };
  });
  /* eslint-disable @typescript-eslint/no-require-imports */
  const svc = require('./gameCenter') as typeof import('./gameCenter');
  const { useGame } = require('@/store/game') as {
    useGame: { setState(s: { game: GameState | null }): void };
  };
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { svc, useGame };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

const game = {
  cityId: 'london',
  ledger: { lifetimeSalesCents: 90_000 },
  rankings: { weekStartSalesCents: 40_000 },
  achievements: { 'first-sale': 1, 'units-100': 2, 'not-a-trophy': 3 },
} as unknown as GameState;

describe('gameCenter service', () => {
  it('is a no-op without the native module (Android, older dev client)', async () => {
    const { svc } = load(null);
    svc.initGameCenter();
    expect(svc.useGameCenter.getState().available).toBe(false);
    await expect(svc.showLeaderboards('london')).resolves.toBe(false);
    await expect(svc.submitAllTime(100)).resolves.toBeUndefined();
    await expect(svc.signInToGameCenter()).resolves.toBe(false);
  });

  it('stays silent when the player is not signed in', async () => {
    const native = mockNativeModule(false);
    const { svc, useGame } = load(native);
    svc.initGameCenter();
    await flush();
    useGame.setState({ game });
    await flush();
    expect(svc.useGameCenter.getState()).toMatchObject({ available: true, authenticated: false });
    expect(native.presentSignIn).not.toHaveBeenCalled();
    expect(native.submitScore).not.toHaveBeenCalled();
    expect(native.reportAchievements).not.toHaveBeenCalled();
    await expect(svc.showLeaderboards()).resolves.toBe(false);
  });

  it('sends scores and trophies once signed in, then debounces', async () => {
    const native = mockNativeModule(true);
    const { svc, useGame } = load(native);
    useGame.setState({ game });
    svc.initGameCenter();
    await flush();
    expect(svc.useGameCenter.getState()).toMatchObject({ authenticated: true, displayName: 'P1' });
    expect(native.submitScore).toHaveBeenCalledWith(90_000, ['coinline.alltime']);
    expect(native.submitScore).toHaveBeenCalledWith(50_000, ['coinline.weekly.world']);
    expect(native.reportAchievements).toHaveBeenCalledWith(
      ['coinline.ach.first_sale', 'coinline.ach.units_100'],
      [100, 100],
    );
    native.submitScore.mockClear();
    native.reportAchievements.mockClear();
    useGame.setState({
      game: { ...game, ledger: { ...game.ledger, lifetimeSalesCents: 95_000 } } as GameState,
    });
    await flush();
    expect(native.submitScore).not.toHaveBeenCalled(); // within the interval
    expect(native.reportAchievements).not.toHaveBeenCalled(); // already reported

    await svc.showLeaderboards('london');
    expect(native.showDashboard).toHaveBeenCalledWith('coinline.weekly.world');
  });

  it('waits for a verified clock before sending scores (trophies still go)', async () => {
    const native = mockNativeModule(true);
    const { svc, useGame } = load(native, false);
    useGame.setState({ game });
    svc.initGameCenter();
    await flush();
    expect(native.submitScore).not.toHaveBeenCalled();
    expect(native.reportAchievements).toHaveBeenCalled();
  });
});
