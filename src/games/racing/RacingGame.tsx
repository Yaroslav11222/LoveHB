import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { asset } from '../../content/world';
import { createRace, startRace, stepRace, recoverPlayer, raceConfig } from './engine';
import type { RaceInput, RaceState } from './engine';
import { createScenery, drawRace } from './render';
import type { PetImages } from './render';
import { RaceControlsHint } from './RaceControlsHint';
import { VictoryCinematic } from './VictoryCinematic';
import { finishPresentation } from './finish';
import { markPortalCompleted } from '../../content/portalProgress';
import './racing.css';

const formatTime = (time: number) => `${Math.floor(time / 60)}:${(time % 60).toFixed(1).padStart(4, '0')}`;
const petNames = ['cat', 'dog', 'rabbit', 'snoopy'];

export function RacingGame({ onExit }: { onExit: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLElement>(null);
  const race = useRef<RaceState>(createRace());
  const input = useRef<RaceInput>({ steer: 0, throttle: 0, boost: false, brake: false });
  const held = useRef(new Set<string>());
  const [hud, setHud] = useState(race.current);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [paused, setPaused] = useState(false);
  const pause = useRef(false);
  const result = useRef<HTMLHeadingElement>(null);
  const petImages = useRef<PetImages>([]);

  const syncInput = () => {
    const keys = held.current;
    input.current = { steer: (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0), throttle: keys.has('gas') || keys.has('boost') ? 1 : 0, boost: keys.has('boost'), brake: keys.has('brake') };
  };
  const clearInput = () => { held.current.clear(); syncInput(); };
  const togglePause = () => { if (race.current.phase !== 'racing' && race.current.phase !== 'countdown') return; pause.current = !pause.current; setPaused(pause.current); clearInput(); if (!pause.current) root.current?.focus(); };
  const start = () => { clearInput(); pause.current = false; setPaused(false); race.current = startRace(); setHud(race.current); root.current?.focus(); };
  const recover = () => { if (pause.current) return; race.current = recoverPlayer(race.current); setHud(race.current); root.current?.focus(); };

  useEffect(() => {
    let disposed = false, frame = 0;
    const ctx = canvas.current!.getContext('2d')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const loadPet = (name: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = asset(`racing/${name}.png`); });
    Promise.all([...petNames, 'mystery-shell', 'mystery-mark'].map(loadPet)).then(images => {
      if (disposed) return;
      const pets = images.slice(0, petNames.length);
      petImages.current = pets;
      const scenery = createScenery();
      const effects = { marks: [], stamp: 0 };
      setLoaded(true);
      let last = 0, accumulator = 0, lastHud = 0;
      const tick = (time: number) => {
        if (disposed) return;
        const delta = last ? Math.min((time - last) / 1000, .1) : 0; last = time;
        if (!pause.current) {
          accumulator += delta;
          while (accumulator >= 1 / 60) { race.current = stepRace(race.current, input.current, 1 / 60); accumulator -= 1 / 60; }
        } else accumulator = 0;
        if (finishPresentation(race.current) !== 'victory') drawRace(ctx, race.current, scenery, pets, reduced.matches, pause.current ? race.current.clock : time / 1000, effects);
        if (time - lastHud > 90) { setHud(race.current); lastHud = time; }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }).catch(() => { if (!disposed) setError(true); });
    const blur = () => { clearInput(); if (race.current.phase === 'racing' || race.current.phase === 'countdown') { pause.current = true; setPaused(true); } };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    return () => { disposed = true; cancelAnimationFrame(frame); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useEffect(() => {
    if (finishPresentation(hud) === 'victory') markPortalCompleted('something-ahead');
    if (finishPresentation(hud) === 'retry') result.current?.focus();
  }, [hud.phase, hud.place]);

  const keyAction = (key: string) => ({ ArrowLeft: 'left', a: 'left', A: 'left', ф: 'left', ArrowRight: 'right', d: 'right', D: 'right', в: 'right', ArrowUp: 'gas', w: 'gas', W: 'gas', ц: 'gas', ' ': 'boost', ArrowDown: 'brake', s: 'brake', ы: 'brake' } as Record<string, string>)[key];
  const press = (event: PointerEvent<HTMLButtonElement>, action: string) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); held.current.add(action); syncInput(); };
  const release = (action: string) => { held.current.delete(action); syncInput(); };
  const active = hud.phase === 'racing' || hud.phase === 'countdown';

  return <section className="race-world" ref={root} tabIndex={-1} aria-labelledby="chapter-title" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) clearInput(); }} onKeyDown={event => {
    if (event.target instanceof HTMLButtonElement) return;
    const action = keyAction(event.key);
    if (action && active && !paused) { event.preventDefault(); held.current.add(action); syncInput(); }
    if ((event.key === 'p' || event.key === 'з') && !event.repeat) togglePause();
    if ((event.key === 'r' || event.key === 'к') && !event.repeat) { event.preventDefault(); recover(); }
  }} onKeyUp={event => { const action = keyAction(event.key); if (action) { event.preventDefault(); release(action); } }}>
    <div className="race-shell">
      <header className="race-hud">
        <div className="race-hud__place"><strong>{hud.place}<small>/4</small></strong><span>место</span></div>
        <div className="race-hud__middle"><h2 id="chapter-title">Розовый гран-при</h2><span>КРУГ {hud.lap} / {raceConfig.laps}</span></div>
        <div className="race-hud__time"><strong>{formatTime(hud.clock)}</strong><button onClick={togglePause} disabled={!active} aria-label={paused ? 'Продолжить гонку' : 'Пауза'}>{paused ? '▶' : 'Ⅱ'}</button></div>
      </header>
      <div className={`race-screen ${hud.collision > 0 ? 'race-screen--contact' : ''}`}>
        <canvas ref={canvas} width="960" height="620" role="img" aria-label="Пиксельная кольцевая трасса. Розовая машина — твоя; кошка, пёс, кролик и маленький Снупи болеют на трибуне."/>
        {hud.phase === 'racing' && <div className="race-pack" aria-label="Положение гонщиков">{[...hud.cars].sort((a,b)=>b.distance-a.distance).map((car,index)=><span key={car.id} className={`race-pack__driver race-pack__driver--${car.id}`}><i/>{index+1}. {['Ты','Лаванда','Шалфей','Персик'][car.id]}<small>{car.id===0?`${Math.round(car.speed*1.25)} км/ч`:car.intent==='pass'?'обгоняет':car.intent==='defend'?'защищается':''}</small></span>)}</div>}
        {(hud.phase === 'ready' || error) && <div className="race-overlay"><div className="race-start">
          <div className="race-lights" aria-hidden="true"><i/><i/><i/><i/><i/></div>
          <h3>На старт?</h3><RaceControlsHint/>
          <button className="race-primary" disabled={!loaded || error} onClick={start}>{error ? 'Не загрузились картинки' : loaded ? 'Поехали' : 'Собираем трибуну…'}</button>
          {error && <button onClick={onExit}>К дверям</button>}
        </div></div>}
        {hud.phase === 'countdown' && !paused && <div className="race-countdown" aria-live="polite" aria-atomic="true">{Math.ceil(hud.countdown)}</div>}
        {paused && active && <div className="race-overlay"><div className="race-start"><h3>Пауза</h3><button className="race-primary" onClick={() => { togglePause(); root.current?.focus(); }}>Продолжить</button></div></div>}
        {finishPresentation(hud) === 'victory' && <VictoryCinematic pets={petImages.current} onReplay={start} onExit={onExit}/>}
        {finishPresentation(hud) === 'retry' && <div className="race-overlay"><div className="race-result">
          <h3 ref={result} tabIndex={-1}>Попробуем ещё?</h3>
          <p>{hud.place} место · {formatTime(hud.clock)}</p><button className="race-primary" onClick={start}>Ещё заезд</button><button className="race-exit" onClick={onExit}>К дверям</button>
        </div></div>}
      </div>
      <footer className="race-dashboard">
        <div className="race-boost"><span>{hud.boosting ? 'УСКОРЕНИЕ' : hud.slipstream ? 'СЛИПСТРИМ' : 'ЗАПАС УСКОРЕНИЯ'}</span><div role="meter" aria-label="Запас ускорения" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hud.energy * 100)}><i style={{ width: `${hud.energy * 100}%` }}/></div></div>
        <button className="race-recover" disabled={!active || paused} onClick={recover}>На трассу <small>R · +2 с</small></button>
        <div className="race-touch" aria-label="Управление гонкой">
          {(['left', 'right', 'brake', 'gas', 'boost'] as const).map(action => <button key={action} disabled={!active || paused} aria-label={{left:'Руль влево',right:'Руль вправо',brake:'Тормоз',gas:'Газ',boost:'Ускорение'}[action]} onPointerDown={event => press(event, action)} onPointerUp={() => release(action)} onPointerCancel={() => release(action)} onLostPointerCapture={() => release(action)}>{{left:'←',right:'→',brake:'Тормоз',gas:'Газ',boost:'Буст'}[action]}</button>)}
        </div>
      </footer>
      <span className="race-announcement" aria-live="polite">{hud.phase === 'finished' ? `Финиш, ${hud.place} место` : ''}</span>
    </div>
  </section>;
}
