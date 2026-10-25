import { findMatches, findMove, goalsComplete, type Progress } from './engine';
import type { SweetLevel } from '../../content/levels/sweetLevel';

export type { Progress } from './engine';
const key = (level: SweetLevel) => `lovehb:match3:v2:${level.id}`;

export function loadProgress(level: SweetLevel, kinds: readonly string[]): Progress | null {
  try {
    const value = JSON.parse(localStorage.getItem(key(level)) ?? 'null');
    if (!value || value.signature !== JSON.stringify(level) || !Array.isArray(value.board) || value.board.length !== level.size ** 2) return null;
    if (!value.board.every((tile: unknown) => typeof tile === 'object' && tile !== null && 'id' in tile && Number.isSafeInteger(tile.id) && Number(tile.id) > 0 && 'kind' in tile && typeof tile.kind === 'string' && kinds.includes(tile.kind))) return null;
    if (new Set(value.board.map((tile: { id: number }) => tile.id)).size !== value.board.length) return null;
    if (!value.board.every((tile: { special?: unknown }) => tile.special === undefined || typeof tile.special === 'string' && ['row', 'column', 'burst', 'prism'].includes(tile.special))) return null;
    if (!Number.isInteger(value.moves) || value.moves < 0 || value.moves > level.moves || !Number.isInteger(value.score) || value.score < 0) return null;
    if (typeof value.collected !== 'object' || value.collected === null || Array.isArray(value.collected)) return null;
    if (!Object.entries(value.collected).every(([kind, count]) => kinds.includes(kind) && Number.isInteger(count) && Number(count) >= 0)) return null;
    if (findMatches(value.board, level.size).length) return null;
    if (value.moves > 0 && !goalsComplete(level.goals, value.collected) && !findMove(value.board, level.size)) return null;
    return { board: value.board, moves: value.moves, collected: value.collected, score: value.score };
  } catch { return null; }
}

export function saveProgress(level: SweetLevel, progress: Progress) {
  try { localStorage.setItem(key(level), JSON.stringify({ ...progress, signature: JSON.stringify(level) })); } catch { /* Private mode/storage limits must not block play. */ }
}
