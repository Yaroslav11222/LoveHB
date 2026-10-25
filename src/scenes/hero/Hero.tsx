import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BirthdayTitle } from './BirthdayTitle';
import { SceneMagic } from '../../components/SceneMagic';

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        gsap.from('.hero-reveal', { y: 24, opacity: 0, duration: 1.4, stagger: 0.16, ease: 'power3.out', clearProps: 'all' });
        gsap.to('.magic-charm-anchor', { y: -65, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 1.8 } });

        // Dimensional parallax transition when scrolling into portals:
        gsap.to('.hero-copy', {
          y: -130,
          scale: 0.90,
          opacity: 0,
          filter: 'blur(8px)',
          ease: 'power1.in',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom 45%',
            scrub: 1.2,
          }
        });

        gsap.to('.hero-halo', {
          scale: 1.4,
          opacity: 0,
          ease: 'power1.in',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom 60%',
            scrub: 1.2,
          }
        });
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, []);

  return <section className="hero" ref={root} aria-labelledby="birthday-title">
    <SceneMagic />
    <div className="hero-halo" aria-hidden="true" />
    <div className="hero-copy">
      <h1 className="sr-only" id="birthday-title">С днём рождения!</h1>
      <div className="hero-art-shell"><BirthdayTitle /></div>
      <a className="journey-pill hero-reveal" href="#portals" aria-label="Листать вниз к дверям">
        <span className="journey-pill__halo" aria-hidden="true" />
        <span className="journey-pill__sparkle" aria-hidden="true">✦</span>
        <span className="journey-pill__text">Листай к дверям</span>
        <span className="journey-pill__arrow" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2.5v11M3.5 9l4.5 4.5L12.5 9" />
          </svg>
        </span>
      </a>
    </div>
  </section>;
}
