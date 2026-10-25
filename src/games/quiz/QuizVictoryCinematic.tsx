import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import gsap from 'gsap';
import { asset } from '../../content/world';
import { AvocadoPlant } from './AvocadoPlant';
import './quiz-victory.css';

/** Duration constants for the quiz victory cinematic (seconds). */
export const quizVictoryTiming = {
  growStart: 0.3,
  growDone:  2.4,
  curtain:   3.1,
  capsule:   3.9,
  shiver:    4.7,
  opening:   5.2,
  reveal:    6.4,
};

function drawCelebration(ctx: CanvasRenderingContext2D, time: number, reduced: boolean) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (reduced || time < quizVictoryTiming.growDone) return;
  const age = time - quizVictoryTiming.growDone;

  const count = 52;
  for (let i = 0; i < count; i++) {
    const speed = 0.35 + (i % 6) * 0.12;
    const t = (age * speed + i * 0.21) % 4.5;
    const progress = t / 4.5;
    const x = ((i * 139 + Math.sin(i * 1.8 + age * 1.1) * 50) % (w - 80)) + 40;
    const y = h + 20 - progress * (h + 80);
    const radius = 3 + (i % 5) * 2.5;
    const alpha = Math.sin(progress * Math.PI) * 0.8;
    if (alpha <= 0.01) continue;

    ctx.save();
    ctx.globalAlpha = alpha;
    if (i % 3 === 0) {
      // Golden 4-point sparkle
      ctx.fillStyle = '#fcecc4';
      ctx.beginPath();
      const arm = radius * 1.6;
      ctx.moveTo(x, y - arm);
      ctx.quadraticCurveTo(x, y, x + arm, y);
      ctx.quadraticCurveTo(x, y, x, y + arm);
      ctx.quadraticCurveTo(x, y, x - arm, y);
      ctx.quadraticCurveTo(x, y, x, y - arm);
      ctx.fill();
    } else {
      // Soft warm creamy bubble
      const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, '#faeed8');
      grad.addColorStop(1, '#eed2a844');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function QuizVictoryCinematic({ onRestart, onExit }: { onRestart: () => void; onExit: () => void }) {
  const root    = useRef<HTMLDivElement>(null);
  const canvas  = useRef<HTMLCanvasElement>(null);
  const title   = useRef<HTMLHeadingElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [growth, setGrowth]     = useState(0);

  useLayoutEffect(() => {
    let frame = 0, disposed = false;
    const playhead = { time: 0 };
    const canvasEl = canvas.current!;
    const ctx = canvasEl.getContext('2d')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Crisp resolution setup
    const rect = root.current!.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasEl.width = Math.round(rect.width * dpr);
    canvasEl.height = Math.round(rect.height * dpr);

    const context = gsap.context(() => {
      const finish = () => { if (disposed) return; cancelAnimationFrame(frame); setRevealed(true); };
      const tl = gsap.timeline({ onComplete: finish });
      timeline.current = tl;

      tl.to(playhead, {
        time: quizVictoryTiming.reveal,
        duration: reduced ? 1.0 : quizVictoryTiming.reveal,
        ease: 'none',
      }, 0);

      // Plant grows from 0 → 10 + gentle zoom
      const growObj = { g: 0 };
      tl.to(growObj, {
        g: 10,
        duration: reduced ? 0.01 : quizVictoryTiming.growDone - quizVictoryTiming.growStart,
        ease: 'power1.inOut',
        onUpdate: () => setGrowth(Math.round(growObj.g)),
      }, quizVictoryTiming.growStart)
      .to('.qv-plant-wrap', {
        scale: 1.05,
        duration: quizVictoryTiming.growDone - quizVictoryTiming.growStart,
        ease: 'power1.out',
      }, quizVictoryTiming.growStart);

      if (reduced) {
        tl.to('.qv-curtain',          { opacity: 1, duration: .2 }, .3)
          .set('.qv-plant-wrap',       { opacity: 0 }, .3)
          .set('.qv-prize',            { opacity: 1, visibility: 'visible' }, .5)
          .set('.qv-prize__half',      { opacity: 0 }, .7)
          .set('.qv-prize__question',  { opacity: 1, scale: 1 }, .7);
      } else {
        // Curtain sweeps in with center radial ripple
        tl.to('.qv-curtain', { opacity: 1, duration: .01 }, quizVictoryTiming.curtain)
          .fromTo('.qv-curtain i', { scale: 0, opacity: 0 }, {
            scale: 1.02, opacity: 1, duration: .45,
            stagger: { grid: [8, 12], amount: .45, from: 'center' }, ease: 'power2.out',
          }, quizVictoryTiming.curtain)
          // Hide plant while curtain covers the scene so it never shows behind the prize
          .to('.qv-plant-wrap', {
            opacity: 0, scale: 0.92, duration: 0.45, ease: 'power2.in',
          }, quizVictoryTiming.curtain + 0.25)
          // Capsule swoops in with elastic bounce
          .fromTo('.qv-prize', {
            opacity: 0, scale: .42, y: -50, rotation: -6, visibility: 'visible',
          }, {
            opacity: 1, scale: 1, y: 0, rotation: 0,
            duration: .8, ease: 'elastic.out(1, 0.75)',
          }, quizVictoryTiming.capsule)
          // Anticipation: vertical seam flares with warm light and capsule pulses
          .fromTo('.qv-seam-flare',
            { opacity: 0, scaleY: 0, scaleX: 0.5 },
            { opacity: 1, scaleY: 1.1, scaleX: 1.8, duration: .4, ease: 'power2.out' },
            quizVictoryTiming.shiver
          )
          .to('.qv-prize', { scale: 1.04, duration: .2, yoyo: true, repeat: 1, ease: 'sine.inOut' }, quizVictoryTiming.shiver)
          .to('.qv-seam-flare', { opacity: 0, duration: .25, ease: 'power2.in' }, quizVictoryTiming.opening)
          // 3D doors opening with perspective
          .to('.qv-prize__half--left', {
            xPercent: -65, rotationZ: -12, rotationY: -30, scale: 0.9, opacity: 0,
            duration: .95, ease: 'power3.inOut',
          }, quizVictoryTiming.opening)
          .to('.qv-prize__half--right', {
            xPercent: 65, rotationZ: 12, rotationY: 30, scale: 0.9, opacity: 0,
            duration: .95, ease: 'power3.inOut',
          }, quizVictoryTiming.opening)
          // Curtain dissolves away outward, clearing the stage!
          .to('.qv-curtain i', {
            opacity: 0, scale: 0.7,
            stagger: { grid: [8, 12], amount: .45, from: 'center' },
            duration: .75, ease: 'power2.inOut',
          }, quizVictoryTiming.opening)
          // Big plush question mark bursts forth in all its glory!
          .fromTo('.qv-prize__question', {
            opacity: 0, scale: .3, y: 65,
            filter: 'blur(10px) brightness(1.6)',
          }, {
            opacity: 1, scale: 1.08, y: -14,
            filter: 'blur(0px) brightness(1) drop-shadow(0 16px 36px rgba(160, 125, 95, 0.16))',
            duration: 1.05, ease: 'elastic.out(1.15, 0.65)',
          }, quizVictoryTiming.opening + .12)
          .to('.qv-prize__question', {
            scale: 1, y: 0, duration: .4, ease: 'power1.out',
          }, quizVictoryTiming.opening + 1.15);
      }

      const draw = () => {
        if (disposed) return;
        drawCelebration(ctx, playhead.time, reduced);
        frame = requestAnimationFrame(draw);
      };
      draw();
    }, root);

    const onVisibility = () => { timeline.current?.paused(document.hidden); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      context.revert();
      timeline.current = null;
    };
  }, []);

  useEffect(() => { if (revealed) title.current?.focus(); }, [revealed]);

  return (
    <div className={`qv-root ${revealed ? 'qv-root--revealed' : ''}`} ref={root} aria-label="Победный финиш — таинственная награда">
      <canvas ref={canvas} className="qv-canvas" aria-hidden="true" />

      <div className="qv-plant-wrap" aria-hidden="true">
        <AvocadoPlant growth={growth} />
      </div>

      {/* Pixel tile curtain */}
      <div className="qv-curtain" aria-hidden="true">
        {Array.from({ length: 96 }, (_, i) => <i key={i} />)}
      </div>

      {/* Mystery prize */}
      <div className="qv-prize" aria-hidden="true">
        <div className="qv-prize__glow" />
        <div className="qv-seam-flare" />
        <img className="qv-prize__question" src={asset('quiz/quiz-mark.png')} alt="" draggable={false} />
        <div className="qv-sparkles" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="qv-sparkle" style={{ '--si': i } as CSSProperties} />
          ))}
        </div>
        <div className="qv-prize__half qv-prize__half--left">
          <img src={asset('quiz/quiz-shell.png')} alt="" draggable={false} />
        </div>
        <div className="qv-prize__half qv-prize__half--right">
          <img src={asset('quiz/quiz-shell.png')} alt="" draggable={false} />
        </div>
      </div>

      {/* Screen-reader-only announcement (hidden visually per user request) */}
      <h3 ref={title} tabIndex={-1} className="sr-only">
        {revealed ? 'Дерево выросло. Открыта таинственная награда — знак вопроса.' : 'Смотри, какой вырос…'}
      </h3>

      {!revealed && (
        <button className="qv-skip" onClick={() => timeline.current?.progress(1)}>
          Пропустить
        </button>
      )}

      {revealed && (
        <div className="qv-actions">
          <button className="qv-primary" onClick={onExit}>К дверям</button>
          <button className="qv-secondary" onClick={onRestart}>Вырастить ещё одно</button>
        </div>
      )}
    </div>
  );
}
