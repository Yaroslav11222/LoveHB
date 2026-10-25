import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { portals, asset, type Portal } from '../../content/world';
import { Symbol } from '../../components/Symbol';
import { SceneMagic } from '../../components/SceneMagic';
import { usePortalProgress, PORTAL_ORDER, type PortalId } from '../../content/portalProgress';

gsap.registerPlugin(ScrollTrigger);

type Props = { onEnter: (portal: Portal, trigger: HTMLButtonElement) => void; entering: string | null };

export function PortalHub({ onEnter, entering }: Props) {
  const root = useRef<HTMLElement>(null);
  const { isUnlocked, isCompleted } = usePortalProgress();
  const [lockedHintId, setLockedHintId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        gsap.fromTo('.thread span:first-child',
          { scaleY: 0, opacity: 0 },
          { scaleY: 1, opacity: 1, duration: 1.1, ease: 'power2.out', transformOrigin: 'top center', scrollTrigger: { trigger: '.thread', start: 'top 92%', once: true } }
        );
        gsap.from('.thread svg', { scale: 0, opacity: 0, duration: 0.8, ease: 'back.out(2)', scrollTrigger: { trigger: '.thread', start: 'top 90%', once: true } });
        gsap.from('.hub-heading > *', { y: 35, opacity: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out', scrollTrigger: { trigger: '.hub-heading', start: 'top 88%', once: true } });
        gsap.from('.portal', {
          y: 75,
          scale: 0.94,
          opacity: 0,
          duration: 1.3,
          stagger: 0.16,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.portal-grid', start: 'top 90%', once: true }
        });
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, []);

  const handlePortalClick = (portal: Portal, event: React.MouseEvent<HTMLButtonElement>) => {
    const unlocked = isUnlocked(portal.id);
    if (!unlocked) {
      event.preventDefault();
      const button = event.currentTarget;
      const doorObj = button.querySelector('.door-object');
      if (doorObj) {
        gsap.fromTo(doorObj, { x: -6 }, { x: 6, duration: 0.08, repeat: 5, yoyo: true, ease: 'sine.inOut', onComplete: () => { gsap.set(doorObj, { x: 0 }); } });
      }
      setLockedHintId(portal.id);
      setTimeout(() => setLockedHintId(current => current === portal.id ? null : current), 2600);
      return;
    }
    onEnter(portal, event.currentTarget);
  };

  return <section id="portals" className="portal-hub" ref={root} aria-labelledby="portals-title">
    <SceneMagic variant="portals" />
    <div className="thread" aria-hidden="true"><span /><Symbol kind="heart" /><span /></div>

    <div className="portal-grid">{portals.map(portal => {
      const unlocked = isUnlocked(portal.id);
      const orderIdx = PORTAL_ORDER.indexOf(portal.id as PortalId);
      const prevPortal = orderIdx > 0 ? portals[orderIdx - 1] : null;
      const isLocked = !unlocked;
      const doorSrc = asset(portal.doorArt);

      return <article className={`portal portal--${portal.theme} ${isLocked ? 'portal--locked' : 'portal--unlocked'} ${entering === portal.id ? 'is-entering' : ''}`} key={portal.id}>
        <button
          className={`portal-button ${isLocked ? 'portal-button--locked' : ''}`}
          aria-label={isLocked ? `Портал «${portal.title}» заблокирован. Сначала пройдите дверь ${prevPortal?.number ?? '01'}` : `Открыть портал «${portal.title}»`}
          disabled={entering !== null}
          aria-disabled={isLocked}
          onClick={event => handlePortalClick(portal, event)}
        >
          <span className="door-aura" aria-hidden="true" />
          <span className="door-object">
            <img className={`door-art ${isLocked ? 'door-art--veiled' : ''}`} src={doorSrc} alt="" width="1024" height="1536" loading="lazy" />

            {!isLocked && <>
              <span className="door-aperture" aria-hidden="true" />
              <img className="door-art door-leaf door-leaf--left" src={doorSrc} alt="" aria-hidden="true" width="1024" height="1536" loading="lazy" />
              <img className="door-art door-leaf door-leaf--right" src={doorSrc} alt="" aria-hidden="true" width="1024" height="1536" loading="lazy" />
              <span className="door-light" aria-hidden="true" />
            </>}

            {isLocked && <>
              <span className="door-veil" aria-hidden="true" />
              <span className="door-seal" aria-hidden="true">
                <span className="door-seal__halo" />
                <span className="door-seal__disc">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="door-seal__lock">
                    <path d="M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3" />
                    <rect x="4.5" y="10.5" width="15" height="10.5" rx="3.5" />
                    <circle cx="12" cy="15.2" r="1.3" fill="currentColor" />
                    <path d="M12 16.5v2" strokeWidth="1.4" />
                  </svg>
                </span>
              </span>
            </>}
          </span>
          <span className="door-floor" aria-hidden="true" />
          {lockedHintId === portal.id && (
            <span className="door-lock-toast" role="alert">
              Сначала пройди дверь {prevPortal?.number ?? '01'} ✨
            </span>
          )}
        </button>
      </article>;
    })}</div>
  </section>;
}
