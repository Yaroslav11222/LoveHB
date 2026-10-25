import type { RaceState } from './engine';

export const victoryTiming = { driveIn: .65, finishCrossing: 2.8, curtain: 3.65, capsule: 4.65, opening: 5.5, reveal: 6.55 };

/** A podium place alone never unlocks the reward: the player must finish first. */
export function finishPresentation(state: Pick<RaceState, 'phase' | 'place'>): 'victory' | 'retry' | null {
  return state.phase !== 'finished' ? null : state.place === 1 ? 'victory' : 'retry';
}
