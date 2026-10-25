import type { Board, Special } from './engine';

export type Run = { cells: number[]; axis: 'row' | 'column' };
export type PowerEffect = { index: number; special: Special };
export type Creation = { index: number; special: Special };

export function findRuns(board: Board, size: number): Run[] {
  const runs: Run[] = [];
  for (const axis of ['row', 'column'] as const) for (let line = 0; line < size; line++) {
    const cell = (offset: number) => axis === 'row' ? line * size + offset : offset * size + line;
    let start = 0;
    while (start < size) {
      const kind = board[cell(start)]?.kind;
      let end = start + 1;
      while (end < size && kind !== undefined && board[cell(end)]?.kind === kind) end++;
      if (kind !== undefined && end - start >= 3) runs.push({ cells: Array.from({ length: end - start }, (_, offset) => cell(start + offset)), axis });
      start = end;
    }
  }
  return runs;
}

export function powerCreations(board: Board, size: number, preferred: readonly number[] = []): Creation[] {
  const groups: Run[][] = [];
  for (const run of findRuns(board, size)) {
    const touching = groups.flatMap((group, index) => group.some(other => other.cells.some(cell => run.cells.includes(cell))) ? [index] : []);
    const merged = [run, ...touching.flatMap(index => groups[index])];
    for (const index of touching.reverse()) groups.splice(index, 1);
    groups.push(merged);
  }
  return groups.flatMap(group => {
    const cells = [...new Set(group.flatMap(run => run.cells))];
    const longest = group.reduce((best, run) => run.cells.length > best.cells.length ? run : best);
    const special: Special | null = longest.cells.length >= 5 ? 'prism'
      : new Set(group.map(run => run.axis)).size > 1 ? 'burst' : longest.cells.length === 4 ? longest.axis : null;
    if (!special) return [];
    const crossing = cells.find(cell => group.filter(run => run.cells.includes(cell)).length > 1);
    const candidates = [...preferred, ...(crossing === undefined ? [] : [crossing]), cells[Math.floor(cells.length / 2)], ...cells];
    const index = candidates.find(cell => cells.includes(cell) && !board[cell].special);
    return index === undefined ? [] : [{ index, special }];
  });
}

export function isPowerSwap(board: Board, a: number, b: number): boolean {
  return board[a]?.special === 'prism' || board[b]?.special === 'prism' || Boolean(board[a]?.special && board[b]?.special);
}

/** Queue-based expansion activates every existing power at most once per wave. */
export function expandPowers(board: Board, initial: readonly number[], size: number, prismTargets = new Map<number, string>()): { clearing: number[]; effects: PowerEffect[] } {
  const clearing = new Set(initial);
  const queue = [...clearing];
  const activated = new Set<number>();
  const effects: PowerEffect[] = [];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor];
    const tile = board[index];
    if (!tile?.special || activated.has(index)) continue;
    activated.add(index);
    effects.push({ index, special: tile.special });
    const row = Math.floor(index / size), column = index % size;
    const add = (cell: number) => { if (!clearing.has(cell)) { clearing.add(cell); queue.push(cell); } };
    if (tile.special === 'row') for (let col = 0; col < size; col++) add(row * size + col);
    if (tile.special === 'column') for (let r = 0; r < size; r++) add(r * size + column);
    if (tile.special === 'burst') for (let r = Math.max(0, row - 1); r <= Math.min(size - 1, row + 1); r++) for (let col = Math.max(0, column - 1); col <= Math.min(size - 1, column + 1); col++) add(r * size + col);
    if (tile.special === 'prism') board.forEach((other, cell) => { if (other.kind === (prismTargets.get(index) ?? tile.kind)) add(cell); });
  }
  return { clearing: [...clearing].sort((a, b) => a - b), effects };
}
