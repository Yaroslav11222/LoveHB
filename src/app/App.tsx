import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Hero } from '../scenes/hero/Hero';
import { PortalHub } from '../scenes/portal-hub/PortalHub';
import { PortalDialog } from '../components/PortalDialog';
import { Symbol } from '../components/Symbol';
import type { Portal } from '../content/world';
import { isPortalUnlocked } from '../content/portalProgress';

export function App() {
  const [selected, setSelected] = useState<Portal | null>(null);
  const [entering, setEntering] = useState<string | null>(null);
  const activeAnimation = useRef<gsap.core.Timeline | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const busy = useRef(false);
  const veil = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => () => { activeAnimation.current?.revert(); }, []);

  const enter = (portal: Portal, button: HTMLButtonElement) => {
    if (busy.current) return;
    if (!isPortalUnlocked(portal.id)) return;
    busy.current = true;
    trigger.current = button;
    setEntering(portal.id);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setSelected(portal); setEntering(null); busy.current = false; return; }
    activeAnimation.current = gsap.timeline({ onComplete: () => { activeAnimation.current?.revert(); activeAnimation.current = null; setEntering(null); busy.current = false; } })
      .to(button.querySelector('.door-object'), { scale: 1.12, y: -8, duration: 0.45, ease: 'power2.out' })
      .to(button.querySelector('.door-aura'), { opacity: 0.35, scale: 1.25, duration: 0.45, ease: 'power2.out' }, 0)
      .call(() => { setSelected(portal); }, undefined, 0.4);
  };

  const close = () => { setSelected(null); requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })); };

  return <>
    <main><Hero /><PortalHub onEnter={enter} entering={entering} /></main>
    <PortalDialog portal={selected} onClose={close} />
    <div className="transition-veil" ref={veil} aria-hidden="true" />
  </>;
}
