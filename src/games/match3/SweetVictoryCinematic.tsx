import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { markPortalCompleted } from '../../content/portalProgress';
import './sweet-victory.css';

interface Props {
  onExit: () => void;
  onRestart: () => void;
}

export function SweetVictoryCinematic({ onExit, onRestart }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const giftStage = useRef<HTMLButtonElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const [opening, setOpening] = useState(false);
  const [readyToClick, setReadyToClick] = useState(false);

  useLayoutEffect(() => {
    let frame = 0, disposed = false;
    const canvasEl = canvas.current;
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rect = root.current?.getBoundingClientRect() ?? { width: 800, height: 600 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasEl.width = Math.round(rect.width * dpr);
    canvasEl.height = Math.round(rect.height * dpr);

    // Particle field
    const particles = Array.from({ length: 42 }, (_, i) => ({
      x: Math.random() * canvasEl.width,
      y: Math.random() * canvasEl.height,
      radius: 3 + (i % 4) * 2.5,
      speed: 0.4 + (i % 5) * 0.25,
      wobble: Math.random() * Math.PI * 2,
      isStar: i % 3 === 0,
    }));

    const draw = () => {
      if (disposed) return;
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      particles.forEach((p, i) => {
        p.y -= p.speed;
        p.wobble += 0.02;
        if (p.y < -20) {
          p.y = canvasEl.height + 20;
          p.x = Math.random() * canvasEl.width;
        }

        const x = p.x + Math.sin(p.wobble) * 15;
        const alpha = Math.min(1, Math.max(0.1, Math.sin((p.y / canvasEl.height) * Math.PI) * 0.7));

        ctx.save();
        ctx.globalAlpha = alpha;

        if (p.isStar) {
          // Golden 4-point sparkle
          ctx.fillStyle = '#fceac2';
          ctx.beginPath();
          const arm = p.radius * 1.5;
          ctx.moveTo(x, p.y - arm);
          ctx.quadraticCurveTo(x, p.y, x + arm, p.y);
          ctx.quadraticCurveTo(x, p.y, x, p.y + arm);
          ctx.quadraticCurveTo(x, p.y, x - arm, p.y);
          ctx.quadraticCurveTo(x, p.y, x, p.y - arm);
          ctx.fill();
        } else {
          // Soft baby pink sugar bubble
          const grad = ctx.createRadialGradient(x - p.radius * 0.3, p.y - p.radius * 0.3, p.radius * 0.1, x, p.y, p.radius);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.5, '#ffd9e4');
          grad.addColorStop(1, '#f7b5cb44');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      frame = requestAnimationFrame(draw);
    };

    draw();

    // Entrance sequence
    const tl = gsap.timeline({
      onComplete: () => {
        setReadyToClick(true);
      },
    });
    timeline.current = tl;

    if (reduced) {
      tl.set('.sweet-gift-stage', { opacity: 1, scale: 1 });
      setReadyToClick(true);
    } else {
      tl.fromTo(
        '.sweet-gift-stage',
        { opacity: 0, scale: 0.65, y: 40 },
        { opacity: 1, scale: 1, y: 0, duration: 1.05, ease: 'back.out(1.4)' }
      );
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      tl.kill();
    };
  }, []);

  const handleOpenGift = () => {
    if (opening) return;
    setOpening(true);

    // Immediately mark portal 1 as completed so portal 2 is unlocked
    markPortalCompleted('little-moments');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      if (typeof window !== 'undefined') window.location.hash = 'portals';
      onExit();
      return;
    }

    const openTl = gsap.timeline({
      onComplete: () => {
        if (typeof window !== 'undefined') window.location.hash = 'portals';
        onExit();
      },
    });

    // 1. Lid floats up and tilts smoothly with minimalist elegance
    openTl.to('.gift-lid', {
      y: -95,
      rotation: -12,
      scale: 1.06,
      opacity: 0.15,
      duration: 0.85,
      ease: 'power2.out',
    }, 0);

    // 2. Pure soft radiant light ascends from inside the gift
    openTl.set('.sweet-gift-burst', { opacity: 1 }, 0.05);
    openTl.fromTo('.sweet-gift-beam',
      { opacity: 0, scaleY: 0.15, scaleX: 0.5 },
      { opacity: 1, scaleY: 3.2, scaleX: 2.0, duration: 0.8, ease: 'power2.out' },
      0.08
    );
    openTl.fromTo('.sweet-gift-glow-ring',
      { opacity: 0, scale: 0.4 },
      { opacity: 0.9, scale: 2.2, duration: 0.85, ease: 'power2.out' },
      0.1
    );

    // 3. Immersive smooth zoom into the portal
    openTl.to('.sweet-gift-stage', {
      scale: 1.45,
      y: 18,
      duration: 0.85,
      ease: 'power2.inOut',
    }, 0.25);

    openTl.to('.sweet-immersion-flash', {
      opacity: 1,
      duration: 0.55,
      ease: 'power2.in',
    }, 0.55);
  };

  const skipIntro = () => {
    timeline.current?.progress(1);
    setReadyToClick(true);
  };

  return (
    <div className="sweet-victory-root" ref={root} role="dialog" aria-modal="true" aria-label="Победа! Открой подарок">
      <canvas ref={canvas} className="sweet-victory-canvas" aria-hidden="true" />
      <div className="sweet-victory-curtain" aria-hidden="true" />

      {/* Interactive Minimalist Gift Box */}
      <button
        ref={giftStage}
        type="button"
        className="sweet-gift-stage"
        onClick={handleOpenGift}
        aria-label="Открыть праздничный подарок и вернуться к дверям"
        disabled={opening}
      >
        <span className="sweet-gift-aura" aria-hidden="true" />
        <span className="sweet-gift-shadow" aria-hidden="true" />

        <span className="sweet-gift-box-wrap">
          {/* Minimalist, Clean, Non-AI Pink Gift Box SVG */}
          <svg className="sweet-gift-svg" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Box Base Gradient */}
              <linearGradient id="boxBaseGrad" x1="45" y1="95" x2="195" y2="215" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffd3dd" />
                <stop offset="50%" stopColor="#fcaec0" />
                <stop offset="100%" stopColor="#f090a6" />
              </linearGradient>

              {/* Lid Gradient */}
              <linearGradient id="lidGrad" x1="38" y1="65" x2="202" y2="105" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffe2e8" />
                <stop offset="50%" stopColor="#fdb8ca" />
                <stop offset="100%" stopColor="#f39db2" />
              </linearGradient>

              {/* Satin Ribbon Gradient */}
              <linearGradient id="ribbonGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fffcf8" />
                <stop offset="50%" stopColor="#faecd8" />
                <stop offset="100%" stopColor="#f6dfc0" />
              </linearGradient>

              {/* Bow Shading */}
              <linearGradient id="bowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#faecd8" />
                <stop offset="100%" stopColor="#edd0a8" />
              </linearGradient>
            </defs>

            {/* Inner box depth (revealed when lid opens) */}
            <rect x="52" y="96" width="136" height="24" rx="8" fill="#e88198" />

            {/* Box Body */}
            <g className="gift-base">
              <rect x="45" y="98" width="150" height="114" rx="16" fill="url(#boxBaseGrad)" />

              {/* Subtle side bevel shadow for depth */}
              <path d="M45 114C45 105.163 52.163 98 61 98H68V212H61C52.163 212 45 204.837 45 196V114Z" fill="rgba(255,255,255,0.22)" />
              <path d="M195 114C195 105.163 187.837 98 179 98H172V212H179C187.837 212 195 204.837 195 196V114Z" fill="rgba(190,95,120,0.18)" />

              {/* Vertical Ribbon */}
              <rect x="105" y="98" width="30" height="114" fill="url(#ribbonGrad)" />
              <rect x="105" y="98" width="1" height="114" fill="rgba(255,255,255,0.7)" />
              <rect x="134" y="98" width="1" height="114" fill="rgba(210,165,130,0.35)" />

              {/* Horizontal Ribbon */}
              <rect x="45" y="142" width="150" height="26" fill="url(#ribbonGrad)" />
              <rect x="45" y="142" width="150" height="1" fill="rgba(255,255,255,0.7)" />
              <rect x="45" y="167" width="150" height="1" fill="rgba(210,165,130,0.35)" />
            </g>

            {/* Box Lid & Bow (lifts up on click) */}
            <g className="gift-lid" style={{ transformOrigin: '120px 88px' }}>
              {/* Lid Base */}
              <rect x="38" y="70" width="164" height="34" rx="10" fill="url(#lidGrad)" />
              <rect x="38" y="70" width="164" height="2" rx="1" fill="rgba(255,255,255,0.75)" />
              <rect x="38" y="102" width="164" height="2" fill="rgba(180,80,105,0.2)" />

              {/* Lid Ribbon Vertical */}
              <rect x="105" y="70" width="30" height="34" fill="url(#ribbonGrad)" />
              <rect x="105" y="70" width="1" height="34" fill="rgba(255,255,255,0.7)" />
              <rect x="134" y="70" width="1" height="34" fill="rgba(210,165,130,0.35)" />

              {/* Ribbon Tails flowing down */}
              <path d="M112 72C106 82 96 95 88 108C86 111 81 108 83 105C90 94 98 82 108 72Z" fill="url(#bowGrad)" opacity="0.9" />
              <path d="M128 72C134 82 144 95 152 108C154 111 159 108 157 105C150 94 142 82 132 72Z" fill="url(#bowGrad)" opacity="0.9" />

              {/* Bow Left Loop */}
              <path
                d="M120 72C105 60 76 42 66 54C56 65 80 84 114 74Z"
                fill="url(#bowGrad)"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="1.2"
              />
              <path d="M110 70C98 62 82 52 74 60C68 67 85 78 106 72Z" fill="rgba(210,160,120,0.22)" />

              {/* Bow Right Loop */}
              <path
                d="M120 72C135 60 164 42 174 54C184 65 160 84 126 74Z"
                fill="url(#bowGrad)"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="1.2"
              />
              <path d="M130 70C142 62 158 52 166 60C172 67 155 78 134 72Z" fill="rgba(210,160,120,0.22)" />

              {/* Bow Center Knot */}
              <ellipse cx="120" cy="72" rx="10" ry="8.5" fill="url(#bowGrad)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            </g>
          </svg>

          {/* Sparkles around box */}
          <span className="sweet-gift-sparkles" aria-hidden="true">
            <span className="sweet-gift-sparkle" />
            <span className="sweet-gift-sparkle" />
            <span className="sweet-gift-sparkle" />
            <span className="sweet-gift-sparkle" />
            <span className="sweet-gift-sparkle" />
          </span>
        </span>

        {/* Minimalist Radiant Light Burst on Open */}
        <span className="sweet-gift-burst" aria-hidden="true">
          <span className="sweet-gift-beam" />
          <span className="sweet-gift-glow-ring" />
        </span>
      </button>

      {/* Screen reader notification */}
      <h3 className="sr-only">
        Уровень пройден! Открыта праздничная подарочная коробка. Нажмите, чтобы открыть её и перейти к дверям.
      </h3>

      {!readyToClick && !opening && (
        <button type="button" className="sweet-victory-skip" onClick={skipIntro}>
          Пропустить
        </button>
      )}

      {/* Smooth immersion flash overlay */}
      <div className="sweet-immersion-flash" aria-hidden="true" />
    </div>
  );
}
