import { useEffect, useRef, useState } from 'react';
import { sweetMotion, type SweetLevel } from '../../content/levels/sweetLevel';
import { areAdjacent, createBoard, findMove, goalsComplete, planTurn, swap, type Pair } from './engine';
import { loadProgress, saveProgress, type Progress } from './storage';
import type { PowerEffect } from './powers';

type Phase = 'idle' | 'swapping' | 'clearing' | 'falling';
type GameState = Progress & {
  phase: Phase;
  selected: number | null;
  clearing: number[];
  hint: Pair | null;
  status: 'playing' | 'won' | 'lost';
  combo: number;
  notice: string;
  effects: PowerEffect[];
  created: number[];
  gained: number;
};

export function useMatch3(level: SweetLevel, kinds: readonly string[]) {
  const fresh = (): GameState => ({ board: createBoard(level.size, kinds), moves: level.moves, collected: {}, score: 0, phase: 'idle', selected: null, clearing: [], hint: null, status: 'playing', combo: 0, effects: [], created: [], gained: 0, notice: 'Меняй соседние сладости. Четыре и пять в ряд дают бонусы.' });
  const [state, setState] = useState<GameState>(() => {
    const saved = loadProgress(level, kinds);
    const game = saved ? { ...fresh(), ...saved } : fresh();
    game.status = goalsComplete(level.goals, game.collected) ? 'won' : game.moves === 0 ? 'lost' : 'playing';
    return game;
  });
  const current = useRef(state);
  const generation = useRef(0);
  const busy = useRef(false);
  const waits = useRef(new Map<ReturnType<typeof setTimeout>, () => void>());
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (patch: Partial<GameState>) => {
    current.current = { ...current.current, ...patch };
    setState(current.current);
  };
  const cancel = () => {
    generation.current++;
    for (const [timer, resolve] of waits.current) { clearTimeout(timer); resolve(); }
    waits.current.clear();
    if (hintTimer.current) clearTimeout(hintTimer.current);
    busy.current = false;
  };
  useEffect(() => () => { cancel(); }, []);
  useEffect(() => { if (state.phase === 'idle') saveProgress(level, state); }, [level, state]);

  const wait = (duration: number) => new Promise<void>(resolve => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => { waits.current.delete(timer); resolve(); }, reduced ? 16 : duration);
    waits.current.set(timer, resolve);
  });

  const play = async (a: number, b: number) => {
    if (busy.current || current.current.status !== 'playing' || !areAdjacent(a, b, level.size)) return;
    busy.current = true;
    const transaction = generation.current;
    const alive = () => transaction === generation.current;
    const original = current.current.board;
    const plan = planTurn(current.current, level, kinds, a, b, Math.random, sweetMotion.maxCascades);
    update({ board: swap(original, a, b), selected: null, hint: null, phase: 'swapping', combo: 0, effects: [], created: [], gained: 0 });
    try {
      await wait(sweetMotion.swap);
      if (!alive()) return;
      if (!plan.valid) {
        update({ board: original, notice: 'Попробуй другую пару — этот обмен не собирает ряд.' });
        await wait(sweetMotion.swap);
        if (alive()) update({ phase: 'idle' });
        return;
      }
      for (const frame of plan.frames) {
        const notice = frame.reshuffled ? 'Бесплатно перемешали сладости. Бонусы сохранены.'
          : frame.effects.length ? `Сработало бонусов: ${frame.effects.length}. Плюс ${frame.gained} очков.`
          : frame.created.length ? 'Создана бонусная сладость. Собери её в ряд или соедини два бонуса.'
          : frame.phase === 'clearing' ? frame.combo > 1 ? `Ещё одно совпадение! Каскад ×${frame.combo}` : 'Какое сладкое совпадение.' : current.current.notice;
        update({ ...frame, notice });
        await wait(frame.phase === 'clearing' ? frame.effects.length ? sweetMotion.power : sweetMotion.clear : sweetMotion.fall);
        if (!alive()) return;
      }
      update({ ...plan.progress, phase: 'idle', status: plan.status, clearing: [], effects: [], created: [], gained: 0 });
    } finally { if (alive()) busy.current = false; }
  };

  const select = (index: number) => {
    if (busy.current || current.current.status !== 'playing') return;
    const selected = current.current.selected;
    if (selected !== null && areAdjacent(selected, index, level.size)) { void play(selected, index); return; }
    update({ selected: selected === index ? null : index, hint: null });
  };

  const hint = () => {
    if (busy.current || current.current.status !== 'playing') return;
    const pair = findMove(current.current.board, level.size);
    update({ hint: pair, selected: null, notice: 'Эти две сладости хотят поменяться местами.' });
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => update({ hint: null }), sweetMotion.hint);
  };

  const win = () => {
    cancel();
    const fullCollected = Object.fromEntries(level.goals.map(g => [g.kind, g.count]));
    update({ collected: fullCollected, status: 'won' });
  };

  const restart = () => { cancel(); const next = fresh(); current.current = next; setState(next); };
  return { state, select, play, hint, restart, win, busy: state.phase !== 'idle' };
}
