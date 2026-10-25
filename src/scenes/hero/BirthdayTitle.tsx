import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { asset } from '../../content/world';
import { titleMotion } from './titleConfig';
import './birthday-title.css';

/** Original self-contained animated SVG; only the reference pointer drift is tuned. */
export function BirthdayTitle() {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add('(pointer:fine) and (prefers-reduced-motion:no-preference)', () => {
      const shell = root.current!;
      const hero = shell.closest('.hero')!;
      const moveX = gsap.quickTo(shell, 'x', { duration: titleMotion.pointerDuration, ease: 'power3.out' });
      const moveY = gsap.quickTo(shell, 'y', { duration: titleMotion.pointerDuration, ease: 'power3.out' });
      const onMove = (event: Event) => {
        const pointer = event as PointerEvent;
        if (pointer.pointerType !== 'mouse') return;
        const rect = hero.getBoundingClientRect();
        moveX(((pointer.clientX - rect.left) / rect.width * 2 - 1) * titleMotion.pointerX);
        moveY(((pointer.clientY - rect.top) / rect.height * 2 - 1) * titleMotion.pointerY);
      };
      const reset = () => { moveX(0); moveY(0); };
      hero.addEventListener('pointermove', onMove);
      hero.addEventListener('pointerleave', reset);
      return () => { hero.removeEventListener('pointermove', onMove); hero.removeEventListener('pointerleave', reset); moveX.tween.kill(); moveY.tween.kill(); gsap.set(shell, { clearProps: 'transform' }); };
    });
    return () => media.revert();
  }, []);
  return <div ref={root} className="birthday-title"><img className="hero-art" src={asset('birthday.svg')} width="1672" height="941" alt="Happy Birthday — пушистые розовые буквы" fetchPriority="high" /></div>;
}
