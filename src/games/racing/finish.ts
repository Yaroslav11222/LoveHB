import type { RaceState } from './engine';

export const victoryTiming = { driveIn: .65, finishCrossing: 2.8, curtain: 3.65, capsule: 4.65, opening: 5.5, reveal: 6.55 };

/** At finish, always show the victory cinematic regardless of place. */
export function finishPresentation(state: Pick<RaceState, 'phase' | 'place'>): 'victory' | 'retry' | null {
  return state.phase !== 'finished' ? null : 'victory';
}
