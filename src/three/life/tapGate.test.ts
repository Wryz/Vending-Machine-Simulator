import { CLOSEUP_MOTION } from '@/config/streetLife';

import { createTapGate, gateActivate, gateBegin, gateClick, gateFinalize } from './tapGate';

describe('3D tap gate (orbit drag vs slot tap)', () => {
  it('fires a tap whose click arrives before the pan fails', () => {
    const g = createTapGate();
    const fire = jest.fn();
    gateBegin(g);
    gateClick(g, fire, 100);
    expect(fire).not.toHaveBeenCalled();
    gateFinalize(g, 110);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('fires a tap whose click arrives after the pan fails', () => {
    const g = createTapGate();
    const fire = jest.fn();
    gateBegin(g);
    gateFinalize(g, 100);
    gateClick(g, fire, 101);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('drops the click that the touch-cancel produces when an orbit starts', () => {
    const g = createTapGate();
    const fire = jest.fn();
    gateBegin(g);
    gateClick(g, fire, 100); // cancel → responderEnd → click, before onStart
    gateActivate(g);
    gateFinalize(g, 900);
    expect(fire).not.toHaveBeenCalled();

    gateBegin(g);
    gateActivate(g);
    gateClick(g, fire, 1000); // same click, after onStart
    gateFinalize(g, 1500);
    expect(fire).not.toHaveBeenCalled();
  });

  it('drops a straggling click right after an orbit, then accepts taps again', () => {
    const g = createTapGate();
    const fire = jest.fn();
    gateBegin(g);
    gateActivate(g);
    gateFinalize(g, 1000);
    gateClick(g, fire, 1000 + CLOSEUP_MOTION.orbitTapGuardMs - 1);
    expect(fire).not.toHaveBeenCalled();
    gateClick(g, fire, 1000 + CLOSEUP_MOTION.orbitTapGuardMs);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('fires at once when the orbit gesture is off', () => {
    const g = createTapGate();
    const fire = jest.fn();
    gateClick(g, fire, 0);
    expect(fire).toHaveBeenCalledTimes(1);
  });
});
