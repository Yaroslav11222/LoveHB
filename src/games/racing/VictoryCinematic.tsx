import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { asset } from '../../content/world';
import type { PetImages } from './render';
import { drawVictoryScene } from './victoryRender';
import { victoryTiming } from './finish';
import './victory.css';

export function VictoryCinematic({ pets, onReplay, onExit }: { pets: PetImages; onReplay: () => void; onExit: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const [revealed, setRevealed] = useState(false);

  useLayoutEffect(() => {
    let frame = 0, disposed = false;
    const playhead = { time: 0 };
    const ctx = canvas.current!.getContext('2d')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const context = gsap.context(() => {
      const finish = () => { if (disposed) return; cancelAnimationFrame(frame); setRevealed(true); };
      const tl = gsap.timeline({ onComplete: finish });
      timeline.current = tl;
      tl.to(playhead, { time: victoryTiming.reveal, duration: reduced ? .9 : victoryTiming.reveal, ease: 'none' }, 0);
      if (reduced) {
        tl.to('.victory-pixel-curtain', { opacity: 1, duration: .25 }, .3)
          .set('.victory-pixel-curtain i', { scale: 1, opacity: 1 }, .3)
          .set('.victory-prize', { opacity: 1, visibility: 'visible' }, .6)
          .set('.victory-prize__half', { opacity: 0 }, .75)
          .set('.victory-prize__question', { opacity: 1, scale: 1 }, .75);
      } else {
        tl.to('.victory-pixel-curtain', { opacity: 1, duration: .01 }, victoryTiming.curtain)
          .fromTo('.victory-pixel-curtain i', { scale: 0, opacity: 0 }, { scale: 1.03, opacity: 1, duration: .42, stagger: { amount: .55, from: 'center' }, ease: 'back.out(1.2)' }, victoryTiming.curtain)
          .fromTo('.victory-prize', { opacity: 0, scale: .66, rotation: -4 }, { opacity: 1, scale: 1, rotation: 0, visibility: 'visible', duration: .65, ease: 'back.out(1.4)' }, victoryTiming.capsule)
          .to('.victory-prize__half--left', { xPercent: -48, rotation: -8, opacity: 0, duration: .85, ease: 'power3.inOut' }, victoryTiming.opening)
          .to('.victory-prize__half--right', { xPercent: 48, rotation: 8, opacity: 0, duration: .85, ease: 'power3.inOut' }, victoryTiming.opening)
          .fromTo('.victory-prize__question', { opacity: 0, scale: .45, y: 22 }, { opacity: 1, scale: 1, y: 0, duration: .9, ease: 'back.out(1.3)' }, victoryTiming.opening + .15);
      }
      const draw = () => { if (disposed) return; drawVictoryScene(ctx, pets, playhead.time, reduced); frame = requestAnimationFrame(draw); };
      draw();
    }, root);
    const visibility = () => { timeline.current?.paused(document.hidden); };
    document.addEventListener('visibilitychange', visibility);
    return () => { disposed = true; cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); context.revert(); timeline.current = null; };
  }, [pets]);

  useEffect(() => { if (revealed) title.current?.focus(); }, [revealed]);

  return <div className={`race-victory ${revealed ? 'race-victory--revealed' : ''}`} ref={root} aria-label="Победный финиш и награда">
    <canvas ref={canvas} width="960" height="620" aria-hidden="true"/>
    <div className="victory-pixel-curtain" aria-hidden="true">{Array.from({ length: 96 }, (_, i) => <i key={i}/>)}</div>
    <div className="victory-prize" aria-hidden="true">
      <div className="victory-prize__glow"/>
      <img className="victory-prize__question" src={asset('racing/mystery-mark.png')} alt="" draggable={false}/>
      <div className="victory-prize__half victory-prize__half--left"><img src={asset('racing/mystery-shell.png')} alt="" draggable={false}/></div>
      <div className="victory-prize__half victory-prize__half--right"><img src={asset('racing/mystery-shell.png')} alt="" draggable={false}/></div>
    </div>
    <h3 ref={title} tabIndex={-1} className="race-announcement">{revealed ? 'Первое место. Открыта таинственная награда — знак вопроса.' : 'Победный финиш'}</h3>
    {!revealed && <button className="victory-skip" onClick={() => timeline.current?.progress(1)}>Пропустить</button>}
    {revealed && <div className="victory-actions"><button className="race-primary" onClick={onExit}>К дверям</button><button className="race-exit" onClick={onReplay}>Ещё заезд</button></div>}
  </div>;
}
