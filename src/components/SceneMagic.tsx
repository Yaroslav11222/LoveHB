import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { asset } from '../content/world';
import './scene-magic.css';

type Props = { variant?: 'hero' | 'portals' | 'garden' };
const placements = [
  { kind: 'heart', x: 8, y: 24, size: 112, turn: -17, delay: 0 },
  { kind: 'bow', x: 91, y: 22, size: 98, turn: 12, delay: 1.8 },
  { kind: 'bow', x: 5, y: 62, size: 78, turn: -15, delay: 3 },
  { kind: 'heart', x: 91, y: 76, size: 100, turn: 18, delay: .7 },
  { kind: 'heart', x: 21, y: 86, size: 45, turn: -24, delay: 4 },
] as const;

/** Decoration belongs to a scene; no global cursor replacement or document listeners. */
export function SceneMagic({ variant = 'hero' }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const particles = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    const scene = root.current?.parentElement;
    if (!scene) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Map<HTMLSpanElement, Animation>();
    let cursor = 0;
    let last = { time: 0, x: 0, y: 0 };
    const sparkle = (event: PointerEvent, burst = false) => {
      if (media.matches || (event.pointerType !== 'mouse' && !burst)) return;
      const now = performance.now();
      if (!burst && (now - last.time < 85 || Math.hypot(event.clientX - last.x, event.clientY - last.y) < 22)) return;
      last = { time: now, x: event.clientX, y: event.clientY };
      const rect = root.current!.getBoundingClientRect();
      for (let i = 0; i < (burst ? 6 : 1); i++) {
        const node = particles.current[cursor++ % 18];
        if (!node) continue;
        animations.get(node)?.cancel();
        const angle = i * Math.PI / 3;
        const dx = burst ? Math.cos(angle) * 38 : (cursor % 3 - 1) * 12;
        const dy = burst ? Math.sin(angle) * 38 - 18 : -32;
        node.style.left = `${event.clientX - rect.left}px`;
        node.style.top = `${event.clientY - rect.top}px`;
        const animation = node.animate([
          { opacity: 0, transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)' },
          { opacity: .8, offset: .16 },
          { opacity: 0, transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.9) rotate(30deg)` },
        ], { duration: burst ? 1050 : 850, easing: 'ease-out' });
        animations.set(node, animation);
        animation.onfinish = () => { if (animations.get(node) === animation) animations.delete(node); };
      }
    };
    const move = (e: PointerEvent) => sparkle(e);
    const press = (e: PointerEvent) => sparkle(e, true);
    const stop = () => { animations.forEach(animation => animation.cancel()); animations.clear(); };
    scene.addEventListener('pointermove', move);
    scene.addEventListener('pointerdown', press);
    media.addEventListener('change', stop);
    return () => { scene.removeEventListener('pointermove', move); scene.removeEventListener('pointerdown', press); media.removeEventListener('change', stop); stop(); };
  }, []);

  return <div ref={root} className={`scene-magic scene-magic--${variant}`} aria-hidden="true">
    {placements.map(({ kind, x, y, size, turn, delay }, i) => <span key={i} className="magic-charm-anchor" style={{ '--charm-x': `${x}%`, '--charm-y': `${y}%`, '--charm-size': `${size}px`, '--charm-turn': `${turn}deg`, '--charm-delay': `${-delay}s` } as CSSProperties}>
      <span className={`magic-charm magic-charm--${kind}`}>
        <img src={asset(`plush/${kind}.png`)} width="1254" height="1254" alt="" loading={variant === 'hero' ? 'eager' : 'lazy'} decoding="async" draggable={false}/>
      </span>
    </span>)}
    <div className="magic-glints">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--glint-x': `${(i * 31 + 7) % 95}%`, '--glint-y': `${(i * 47 + 12) % 89}%`, '--glint-delay': `${i * -.7}s` } as CSSProperties}/>)}</div>
    <div className="magic-trail">{Array.from({ length: 18 }, (_, i) => <span key={i} ref={node => { particles.current[i] = node; }}/>)}</div>
  </div>;
}
