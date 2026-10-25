import { lazy, Suspense, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Symbol } from './Symbol';
import { Ambient } from './Ambient';
import type { Portal } from '../content/world';

const Match3Game = lazy(() => import('../games/match3/Match3Game').then(module => ({ default: module.Match3Game })));
const AvocadoQuiz = lazy(() => import('../games/quiz/AvocadoQuiz').then(module => ({ default: module.AvocadoQuiz })));
const RacingGame = lazy(() => import('../games/racing/RacingGame').then(module => ({ default: module.RacingGame })));

export function PortalDialog({ portal, onClose }: { portal: Portal | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    if (!portal) return;
    const el = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = 'hidden';
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => { gsap.from('.chapter-content > *', { y: 25, opacity: 0, stagger: 0.13, duration: 1.1, ease: 'power3.out' }); }, el);
      return () => ctx.revert();
    });
    return () => { media.revert(); el.close(); document.body.style.overflow = previousOverflow; };
  }, [portal]);

  const isGame = Boolean(portal?.experience);
  return <dialog ref={dialog} className={`chapter chapter--${portal?.theme ?? 'rose'} ${portal?.experience === 'sweet-match' ? 'chapter--game' : ''} ${portal?.experience === 'avocado-quiz' ? 'chapter--quiz' : ''} ${portal?.experience === 'petal-race' ? 'chapter--race' : ''}`} aria-labelledby="chapter-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    {portal && <>{!isGame && <Ambient count={14}/>}<button className="chapter-back" onClick={onClose} autoFocus><span aria-hidden="true">←</span> К дверям</button>{!isGame && <span className="chapter-index">МАЛЕНЬКАЯ ВСЕЛЕННАЯ / {portal.number}</span>}
      {isGame ? <Suspense fallback={<div className="chapter-content"><h2 id="chapter-title">{portal.experience === 'sweet-match' ? 'Готовим сладости…' : portal.experience === 'petal-race' ? 'Готовим трассу…' : 'Открываем оранжерею…'}</h2></div>}>
        {portal.experience === 'sweet-match' ? <Match3Game onExit={onClose} /> : portal.experience === 'petal-race' ? <RacingGame onExit={onClose} /> : <AvocadoQuiz onExit={onClose} />}
      </Suspense> : <><div className="chapter-content"><p className="eyebrow">ТЫ УЖЕ ПО ТУ СТОРОНУ</p><div className={`chapter-keepsake keepsake--${portal.symbol}`}><Symbol kind={portal.symbol} /></div><h2 id="chapter-title">{portal.title}</h2><p className="chapter-intro">{portal.intro}</p><div className="chapter-preview"><span>ПРОДОЛЖЕНИЕ СКОРО</span><p>{portal.message}</p></div><button className="text-link" onClick={onClose}>Посмотреть другие двери <span aria-hidden="true">↗</span></button></div><p className="chapter-footer">У каждого чуда своё время.</p></>}
      </>}
  </dialog>;
}
