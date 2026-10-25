/** Pure match-3 rules. No React, DOM, animation or storage dependencies. */
import { expandPowers, findRuns, isPowerSwap, powerCreations, type PowerEffect } from './powers.ts';
export { expandPowers, findRuns, powerCreations } from './powers.ts';
export type Special = 'row' | 'column' | 'burst' | 'prism';
export type Tile = { id: number; kind: string; special?: Special };
export type Board = Tile[];
export type Pair = readonly [number, number];
export type Random = () => number;
export type Progress = { board: Board; moves: number; collected: Record<string, number>; score: number };
export type Rules = { size: number; goals: readonly { kind: string; count: number }[] };
export type GameStatus = 'playing' | 'won' | 'lost';
export type TurnFrame = Progress & { phase: 'clearing' | 'falling'; clearing: number[]; combo: number; created: number[]; effects: PowerEffect[]; gained: number; reshuffled?: boolean };
export type TurnPlan = { valid: boolean; frames: TurnFrame[]; progress: Progress; status: GameStatus };

export function areAdjacent(a: number, b: number, size: number): boolean {
  return Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a < size * size && b < size * size
    && Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs(a % size - b % size) === 1;
}

export function swap(board: Board, a: number, b: number): Board {
  const next = [...board];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

export function findMatches(board: Board, size: number): number[] {
  return [...new Set(findRuns(board, size).flatMap(run => run.cells))].sort((a, b) => a - b);
}

export function findMove(board: Board, size: number): Pair | null {
  for (let a = 0; a < board.length; a++) {
    for (const b of [a + 1, a + size]) {
      if (!areAdjacent(a, b, size)) continue;
      if (isPowerSwap(board, a, b)) return [a, b];
      const matches = findMatches(swap(board, a, b), size);
      if (matches.includes(a) || matches.includes(b)) return [a, b];
    }
  }
  return null;
}

export function seededRandom(seed: number): Random {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let mixed = Math.imul(value ^ value >>> 15, 1 | value);
    mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, 61 | mixed);
    return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
  };
}

function choose<T>(options: readonly T[], random: Random): T {
  return options[Math.min(options.length - 1, Math.max(0, Math.floor(random() * options.length)))];
}

export function createBoard(size: number, kinds: readonly string[], random: Random = Math.random, firstId = 1): Board {
  if (!Number.isInteger(size) || size < 3 || size > 12 || new Set(kinds).size !== kinds.length || kinds.length < 3) {
    throw new Error('A board needs size 3–12 and at least three unique candy kinds.');
  }
  const fallbackRandom = seededRandom(74291);
  for (let attempt = 0; attempt < 240; attempt++) {
    const rng = attempt < 120 ? random : fallbackRandom;
    const board: Board = [];
    for (let index = 0; index < size * size; index++) {
      const options = kinds.filter(kind => !(
        (index % size >= 2 && board[index - 1]?.kind === kind && board[index - 2]?.kind === kind)
        || (index >= size * 2 && board[index - size]?.kind === kind && board[index - size * 2]?.kind === kind)
      ));
      board.push({ id: firstId + index, kind: choose(options, rng) });
    }
    if (findMove(board, size)) return board;
  }
  throw new Error('Could not create a playable board.');
}

export function refill(board: Board, removed: readonly number[], size: number, kinds: readonly string[], random: Random = Math.random): Board {
  const removedSet = new Set(removed);
  const next: Board = Array(board.length);
  let nextId = Math.max(...board.map(tile => tile.id)) + 1;
  for (let column = 0; column < size; column++) {
    const survivors: Tile[] = [];
    for (let row = size - 1; row >= 0; row--) {
      const index = row * size + column;
      if (!removedSet.has(index)) survivors.push(board[index]);
    }
    for (let row = size - 1; row >= 0; row--) {
      next[row * size + column] = survivors[size - 1 - row] ?? { id: nextId++, kind: choose(kinds, random) };
    }
  }
  return next;
}

export function countCollected(board: Board, matches: readonly number[]): Record<string, number> {
  const collected: Record<string, number> = {};
  for (const index of new Set(matches)) {
    const kind = board[index].kind;
    collected[kind] = (collected[kind] ?? 0) + 1;
  }
  return collected;
}

export function goalsComplete(goals: readonly { kind: string; count: number }[], collected: Record<string, number>): boolean {
  return goals.every(goal => (collected[goal.kind] ?? 0) >= goal.count);
}

export function reshuffle(board: Board, size: number, kinds: readonly string[], random: Random): Board {
  for (let attempt = 0; attempt < 120; attempt++) {
    const next = [...board];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.max(0, Math.min(i, Math.floor(random() * (i + 1))));
      [next[i], next[j]] = [next[j], next[i]];
    }
    if (!findMatches(next, size).length && findMove(next, size)) return next;
  }
  // A bounded fallback retains every power, even for a pathological RNG.
  const next = createBoard(size, kinds, random, Math.max(...board.map(tile => tile.id)) + 1);
  const powers = board.filter(tile => tile.special);
  powers.forEach((tile, index) => { next[index] = { ...next[index], special: tile.special }; });
  return next;
}

/** Resolve all rules up front. UI only plays these immutable frames at its own speed. */
export function planTurn(progress: Progress, rules: Rules, kinds: readonly string[], a: number, b: number, random: Random = Math.random, maxCascades = 24): TurnPlan {
  const status = (): GameStatus => goalsComplete(rules.goals, progress.collected) ? 'won' : progress.moves === 0 ? 'lost' : 'playing';
  const invalid = (): TurnPlan => ({ valid: false, frames: [], progress, status: status() });
  if (status() !== 'playing' || !areAdjacent(a, b, rules.size)) return invalid();
  let board = swap(progress.board, a, b);
  let matches = findMatches(board, rules.size);
  let manual: number[] = [];
  const prismTargets = new Map<number, string>();
  if (isPowerSwap(board, a, b)) {
    manual = [a, b];
    if (board[a].special === 'prism' && board[b].special === 'prism') manual = board.map((_, index) => index);
    else {
      if (board[a].special === 'prism') prismTargets.set(a, board[b].kind);
      if (board[b].special === 'prism') prismTargets.set(b, board[a].kind);
    }
  }
  if (!matches.length && !manual.length) return invalid();
  let collected = { ...progress.collected };
  let score = progress.score;
  const moves = progress.moves - 1;
  const frames: TurnFrame[] = [];
  let combo = 0;
  while (matches.length || manual.length) {
    combo++;
    const proposals = powerCreations(board, rules.size, combo === 1 ? [b, a] : []);
    const anchors = new Set(proposals.map(proposal => proposal.index));
    const expansion = expandPowers(board, [...matches.filter(index => !anchors.has(index)), ...manual], rules.size, combo === 1 ? prismTargets : undefined);
    const clearing = expansion.clearing;
    const created = proposals.filter(proposal => !clearing.includes(proposal.index));
    board = board.map((tile, index) => { const power = created.find(proposal => proposal.index === index); return power ? { ...tile, special: power.special } : tile; });
    const additions = countCollected(board, clearing);
    collected = { ...collected };
    for (const [kind, count] of Object.entries(additions)) collected[kind] = (collected[kind] ?? 0) + count;
    const gained = clearing.length * 10 * combo + created.length * 40 + expansion.effects.length * 20;
    score += gained;
    frames.push({ board, moves, collected, score, phase: 'clearing', clearing, combo, created: created.map(power => power.index), effects: expansion.effects, gained });
    board = refill(board, clearing, rules.size, kinds, random);
    frames.push({ board, moves, collected, score, phase: 'falling', clearing: [], combo, created: [], effects: [], gained: 0 });
    manual = [];
    matches = findMatches(board, rules.size);
    if (combo >= maxCascades && matches.length) {
      board = reshuffle(board, rules.size, kinds, random);
      frames.push({ board, moves, collected, score, phase: 'falling', clearing: [], combo, reshuffled: true, created: [], effects: [], gained: 0 });
      break;
    }
  }
  const won = goalsComplete(rules.goals, collected);
  if (!won && moves > 0 && !findMove(board, rules.size)) {
    board = reshuffle(board, rules.size, kinds, random);
    frames.push({ board, moves, collected, score, phase: 'falling', clearing: [], combo, reshuffled: true, created: [], effects: [], gained: 0 });
  }
  return { valid: true, frames, progress: { board, moves, collected, score }, status: won ? 'won' : moves === 0 ? 'lost' : 'playing' };
}
