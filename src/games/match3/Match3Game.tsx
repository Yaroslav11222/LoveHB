import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import gsap from 'gsap';
import { sweets, sweetLevel, sweetMotion } from '../../content/levels/sweetLevel';
import { Symbol } from '../../components/Symbol';
import { useMatch3 } from './useMatch3';
import { PowerMark, powerNames } from './PowerMark';
import { SweetsDecor } from './SweetsDecor';
import { markPortalCompleted } from '../../content/portalProgress';
import { SweetVictoryCinematic } from './SweetVictoryCinematic';
import './match3.css';
import './sweet-identity.css';

const kinds = sweets.map(sweet => sweet.id);
const sweetById = Object.fromEntries(sweets.map(sweet => [sweet.id, sweet]));

export function Match3Game({ onExit }: { onExit: () => void }) {
  const level = sweetLevel;
  const { state, select, play, hint, restart, win, busy } = useMatch3(level, kinds);
  const boardRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const previous = useRef(new Map<number, number>());
  const swipe = useRef<{ pointer: number; index: number; x: number; y: number } | null>(null);
  const ignoreClick = useRef(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [flash, setFlash] = useState<{ id: number; gained: number; combo: number } | null>(null);


  useEffect(() => {
    if (state.status === 'won') {
      markPortalCompleted('little-moments');
    }
  }, [state.status]);
  useEffect(() => {
    if (state.phase === 'clearing' && state.gained > 0) setFlash({ id: state.score, gained: state.gained, combo: state.combo });
  }, [state.phase, state.score, state.gained, state.combo]);
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 650);
    return () => clearTimeout(timer);
  }, [flash]);

  useLayoutEffect(() => {
    const board = boardRef.current!;
    const positions = previous.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cell = board.clientWidth / level.size;
    const animations: gsap.core.Tween[] = [];
    for (const [index, tile] of state.board.entries()) {
      const node = board.querySelector(`[data-tile-id="${tile.id}"]`);
      if (!node) continue;
      const oldIndex = positions.get(tile.id);
      if (!reduced && (oldIndex !== undefined ? oldIndex !== index : positions.size > 0)) {
        const x = oldIndex === undefined ? 0 : (oldIndex % level.size - index % level.size) * cell;
        const y = oldIndex === undefined ? -cell * 1.5 : (Math.floor(oldIndex / level.size) - Math.floor(index / level.size)) * cell;
        animations.push(gsap.fromTo(node, { x, y, opacity: oldIndex === undefined ? 0 : 1 }, { x: 0, y: 0, opacity: 1, duration: (state.phase === 'swapping' ? sweetMotion.swap : sweetMotion.fall) / 1000, ease: state.phase === 'swapping' ? 'power2.inOut' : 'back.out(1.15)', clearProps: 'transform,opacity' }));
      }
    }
    previous.current = new Map(state.board.map((tile, index) => [tile.id, index]));
    return () => animations.forEach(animation => { animation.revert(); });
  }, [state.board, level.size]);

  useEffect(() => { if (state.status !== 'playing') resultRef.current?.focus(); }, [state.status]);

  const focusCell = (index: number) => {
    setFocusIndex(index);
    boardRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${index}"]`)?.focus({ preventScroll: true });
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const row = Math.floor(index / level.size), col = index % level.size;
    const next = event.key === 'ArrowLeft' ? row * level.size + Math.max(0, col - 1)
      : event.key === 'ArrowRight' ? row * level.size + Math.min(level.size - 1, col + 1)
      : event.key === 'ArrowUp' ? Math.max(0, row - 1) * level.size + col
      : event.key === 'ArrowDown' ? Math.min(level.size - 1, row + 1) * level.size + col : null;
    if (next !== null) { event.preventDefault(); focusCell(next); }
  };

  const startSwipe = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    if (busy || state.status !== 'playing' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    ignoreClick.current = false;
    swipe.current = { pointer: event.pointerId, index, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const endSwipe = (event: PointerEvent<HTMLButtonElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.pointer !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    ignoreClick.current = true;
    const next = start.index + (Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : Math.sign(dy) * level.size);
    void play(start.index, next);
  };

  return <section className="sweet-world" aria-labelledby="chapter-title">
    <SweetsDecor/>
    <h2 id="chapter-title" className="sr-only">{level.title}</h2>
    <div className="sweet-play-area">
      <div className="sweet-panel">
        <div className="sweet-hud">
        <div className={`moves-dial ${state.moves <= 5 ? 'moves-dial--last' : ''}`} aria-label={`Осталось ходов: ${state.moves}`}><strong>{state.moves}</strong><span>ХОДОВ</span></div>
        <div className="sweet-goals" aria-label="Цели уровня">{level.goals.map(goal => {
          const count = Math.min(state.collected[goal.kind] ?? 0, goal.count);
          const complete = count >= goal.count;
          return <div className={`sweet-goal ${complete ? 'is-complete' : ''}`} data-sweet={goal.kind} key={goal.kind} aria-label={`${sweetById[goal.kind].name}: ${count} из ${goal.count}`}><img src={sweetById[goal.kind].image} alt="" /><span>{complete ? <strong className="goal-check">✓</strong> : <><strong>{count}</strong><span>/{goal.count}</span></>}</span></div>;
        })}</div>
        </div>
        <div className="sweet-board-frame">
          <div className="sweet-board" ref={boardRef} role="group" aria-label={`Поле сладостей ${level.size} на ${level.size}`} aria-describedby="sweet-short-help" aria-busy={busy} style={{ '--size': level.size } as CSSProperties}>
            <div className="sweet-squares" aria-hidden="true">{Array.from({ length: level.size ** 2 }, (_, index) => <span key={index} />)}</div>
            {state.board.map((tile, index) => <button type="button" key={tile.id} data-cell={index} data-tile-id={tile.id} className={`sweet-tile ${tile.special ? `has-power has-power--${tile.special}` : ''} ${state.created.includes(index) ? 'is-created' : ''} ${state.selected === index ? 'is-selected' : ''} ${state.clearing.includes(index) ? 'is-clearing' : ''} ${state.hint?.includes(index) ? 'is-hint' : ''}`} style={{ left: `${index % level.size / level.size * 100}%`, top: `${Math.floor(index / level.size) / level.size * 100}%` }} aria-label={`${sweetById[tile.kind].name}${tile.special ? `, бонус: ${powerNames[tile.special]}` : ''}, ряд ${Math.floor(index / level.size) + 1}, столбец ${index % level.size + 1}`} aria-pressed={state.selected === index} aria-disabled={busy || state.status !== 'playing'} tabIndex={state.status === 'playing' && focusIndex === index ? 0 : -1}
              onFocus={() => setFocusIndex(index)} onKeyDown={event => onKey(event, index)} onPointerDown={event => startSwipe(event, index)} onPointerUp={endSwipe} onPointerCancel={() => { swipe.current = null; }} onClick={() => { if (ignoreClick.current) { ignoreClick.current = false; return; } select(index); }}>
              <span className="sweet-piece" data-sweet={tile.kind}><img src={sweetById[tile.kind].image} alt="" draggable={false} />{tile.special && <span className="power-seal"><PowerMark kind={tile.special} /></span>}</span>
            </button>)}
            <div className="board-effects" aria-hidden="true">{state.effects.map(effect => <span key={`${state.score}-${effect.index}`} className={`power-effect power-effect--${effect.special}`} style={{ '--row': `${(Math.floor(effect.index / level.size) + 0.5) / level.size * 100}%`, '--col': `${(effect.index % level.size + 0.5) / level.size * 100}%` } as CSSProperties} />)}{flash && <span key={flash.id} className="turn-float">+{flash.gained}{flash.combo > 1 && <small>КАСКАД ×{flash.combo}</small>}</span>}</div>
          </div>
          {state.status === 'lost' && <div className="sweet-result">
            <span className="result-stamp" aria-hidden="true">↻</span>
            <h3 ref={resultRef} tabIndex={-1}>Ходы закончились</h3>
            <p>{state.score.toLocaleString('ru-RU')} очков</p>
            <button className="sweet-primary" onClick={() => { restart(); requestAnimationFrame(() => focusCell(0)); }}>Ещё одна попытка <span aria-hidden="true">↻</span></button>
            <button className="sweet-result-exit" onClick={onExit}>Вернуться к дверям <span aria-hidden="true">↗</span></button>
          </div>}
        </div>
        {state.status === 'won' && <SweetVictoryCinematic onExit={onExit} onRestart={restart} />}
        <div className="sweet-panel-bottom"><span>ОЧКИ <strong>{state.score.toLocaleString('ru-RU')}</strong></span><span className={state.combo > 1 ? 'combo-on' : ''}>{state.combo > 1 ? `×${state.combo}` : '01'}</span></div>
      </div>
      <div className="sweet-controls"><button onClick={hint} disabled={busy || state.status !== 'playing'}><Symbol /> Подсказка</button><details className="sweet-help"><summary aria-label="Правила и бонусы">?</summary><div className="sweet-help-content"><strong>Три в ряд</strong><p id="sweet-short-help">Меняй соседние сладости и собирай цели сверху. Нажатием или свайпом. На клавиатуре — стрелки и Enter.</p><div><PowerMark kind="row" /><span>4 в ряд — очистка линии</span></div><div><PowerMark kind="burst" /><span>Т или Г — взрыв 3×3</span></div><div><PowerMark kind="prism" /><span>5 в ряд — весь выбранный вид</span></div><p>Линия и взрыв срабатывают в совпадении. Соедини два бонуса — сработают оба. Круглый бонус меняй с любой сладостью.</p></div></details><button onClick={restart} disabled={busy} aria-label="Начать уровень заново"><span aria-hidden="true">↻</span></button></div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{state.status === 'won' ? 'Все сладости собраны!' : state.status === 'lost' ? 'Ходы закончились. Можно попробовать снова.' : state.notice}</p>
    </div>
  </section>;
}
