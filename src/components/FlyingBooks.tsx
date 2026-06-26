import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import BookMascot, { type BookMascotHandle } from './BookMascot';
import styles from './FlyingBooks.module.css';

gsap.registerPlugin(MotionPathPlugin);

interface Props { visible: boolean; }

// ── Falling page particle spawned from a flying book ─────────────────────────
function spawnFallingPage(
  wrap:       HTMLDivElement,
  container:  HTMLDivElement,
  bookScale:  number,
  cleanupFns: Array<() => void>,
) {
  const x = gsap.getProperty(wrap, 'x') as number;
  const y = gsap.getProperty(wrap, 'y') as number;

  const el = document.createElement('div');
  const w  = Math.round(18 * bookScale);
  const h  = Math.round(23 * bookScale);
  Object.assign(el.style, {
    position:     'absolute',
    top:          '0',
    left:         '0',
    width:        `${w}px`,
    height:       `${h}px`,
    background:   'linear-gradient(128deg, rgba(22,50,105,0.92) 0%, rgba(10,22,52,0.96) 55%, rgba(6,12,34,1) 100%)',
    border:       '1px solid rgba(41,141,255,0.28)',
    borderRadius: '1px',
    boxShadow:    '0 0 8px rgba(41,141,255,0.22)',
    pointerEvents:'none',
  });
  container.appendChild(el);

  const offsetX = (Math.random() - 0.5) * 28 * bookScale;
  const driftX  = (Math.random() - 0.5) * 90;
  const fallY   = 100 + Math.random() * 80;
  const rot0    = (Math.random() - 0.5) * 20;
  const rot1    = rot0 + (Math.random() - 0.5) * 200;
  const dur     = 1.8 + Math.random() * 1.4;

  gsap.set(el, {
    x:        x + offsetX,
    y:        y - 8 * bookScale,
    xPercent: -50,
    yPercent: -50,
    opacity:  0.72,
    rotation: rot0,
    scale:    0.85 + Math.random() * 0.25,
  });

  const tween = gsap.to(el, {
    x:        x + offsetX + driftX,
    y:        y - 8 * bookScale + fallY,
    opacity:  0,
    rotation: rot1,
    scale:    0.3,
    duration: dur,
    ease:     'power1.in',
    onComplete() { el.remove(); },
  });

  cleanupFns.push(() => { tween.kill(); el.remove(); });
}

// ── Schedule a recurring falling page for one book ───────────────────────────
function scheduleFalling(
  wrap:       HTMLDivElement,
  container:  HTMLDivElement,
  bookScale:  number,
  initialDelay: number,
  cleanupFns: Array<() => void>,
) {
  let timer: gsap.core.Tween | null = null;

  function next() {
    const interval = 10 + Math.random() * 12; // 10–22 s between pages
    timer = gsap.delayedCall(interval, () => {
      const opacity = gsap.getProperty(wrap, 'opacity') as number;
      if (opacity > 0.08) spawnFallingPage(wrap, container, bookScale, cleanupFns);
      next();
    });
  }

  const firstTimer = gsap.delayedCall(initialDelay, next);
  cleanupFns.push(() => { firstTimer.kill(); timer?.kill(); });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FlyingBooks({ visible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const w1 = useRef<HTMLDivElement>(null);
  const w2 = useRef<HTMLDivElement>(null);
  const w3 = useRef<HTMLDivElement>(null);
  const w4 = useRef<HTMLDivElement>(null);
  const w5 = useRef<HTMLDivElement>(null);

  const b1 = useRef<BookMascotHandle>(null);
  const b2 = useRef<BookMascotHandle>(null);
  const b3 = useRef<BookMascotHandle>(null);
  const b4 = useRef<BookMascotHandle>(null);
  const b5 = useRef<BookMascotHandle>(null);

  const ctxRef = useRef<gsap.Context | null>(null);
  const cleanupFns = useRef<Array<() => void>>([]);

  useEffect(() => {
    const reduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W         = window.innerWidth;
    const H         = window.innerHeight - 52;
    const container = containerRef.current!;

    const BOOKS = [
      // ── Book 1: large, slow, left-side sweep ──
      {
        wrap: w1.current!, pageLeft: b1.current!.pageLeft, pageRight: b1.current!.pageRight,
        scale: 0.82, opacity: 0.46, duration: 24, delay: 0,   wingBeat: 3.6, bankAmp: 9,
        startX: W * 0.12, startY: H * 0.38,
        path: [
          { x: W * 0.06, y: H * 0.20 }, { x: W * 0.24, y: H * 0.10 },
          { x: W * 0.28, y: H * 0.46 }, { x: W * 0.14, y: H * 0.66 },
          { x: W * 0.05, y: H * 0.50 }, { x: W * 0.12, y: H * 0.38 },
        ],
      },
      // ── Book 2: medium-large, right-side circuit ──
      {
        wrap: w2.current!, pageLeft: b2.current!.pageLeft, pageRight: b2.current!.pageRight,
        scale: 0.65, opacity: 0.38, duration: 18, delay: 5,  wingBeat: 2.8, bankAmp: 11,
        startX: W * 0.84, startY: H * 0.30,
        path: [
          { x: W * 0.93, y: H * 0.18 }, { x: W * 0.76, y: H * 0.52 },
          { x: W * 0.86, y: H * 0.70 }, { x: W * 0.95, y: H * 0.46 },
          { x: W * 0.84, y: H * 0.30 },
        ],
      },
      // ── Book 3: medium, upper-screen drift ──
      {
        wrap: w3.current!, pageLeft: b3.current!.pageLeft, pageRight: b3.current!.pageRight,
        scale: 0.52, opacity: 0.30, duration: 15, delay: 9,  wingBeat: 2.3, bankAmp: 8,
        startX: W * 0.52, startY: H * 0.12,
        path: [
          { x: W * 0.30, y: H * 0.07 }, { x: W * 0.14, y: H * 0.16 },
          { x: W * 0.38, y: H * 0.09 }, { x: W * 0.66, y: H * 0.06 },
          { x: W * 0.82, y: H * 0.14 }, { x: W * 0.60, y: H * 0.09 },
          { x: W * 0.52, y: H * 0.12 },
        ],
      },
      // ── Book 4: small, bottom-left corner ──
      {
        wrap: w4.current!, pageLeft: b4.current!.pageLeft, pageRight: b4.current!.pageRight,
        scale: 0.40, opacity: 0.24, duration: 12, delay: 13, wingBeat: 1.9, bankAmp: 13,
        startX: W * 0.18, startY: H * 0.74,
        path: [
          { x: W * 0.08, y: H * 0.80 }, { x: W * 0.22, y: H * 0.88 },
          { x: W * 0.32, y: H * 0.76 }, { x: W * 0.24, y: H * 0.64 },
          { x: W * 0.11, y: H * 0.68 }, { x: W * 0.18, y: H * 0.74 },
        ],
      },
      // ── Book 5: tiny, bottom-right, fastest ──
      {
        wrap: w5.current!, pageLeft: b5.current!.pageLeft, pageRight: b5.current!.pageRight,
        scale: 0.30, opacity: 0.18, duration: 9,  delay: 17, wingBeat: 1.5, bankAmp: 10,
        startX: W * 0.72, startY: H * 0.76,
        path: [
          { x: W * 0.80, y: H * 0.68 }, { x: W * 0.88, y: H * 0.82 },
          { x: W * 0.78, y: H * 0.88 }, { x: W * 0.65, y: H * 0.80 },
          { x: W * 0.70, y: H * 0.70 }, { x: W * 0.72, y: H * 0.76 },
        ],
      },
    ];

    ctxRef.current = gsap.context(() => {
      BOOKS.forEach(({ wrap, pageLeft, pageRight, scale, opacity, duration, delay, wingBeat, bankAmp, startX, startY, path }) => {
        // ── Initial placement ────────────────────────────────────────────────
        gsap.set(wrap, {
          xPercent: -50, yPercent: -50,
          x: startX, y: startY,
          scale, opacity: 0, rotation: 0,
        });
        gsap.set(pageLeft,  { rotateY: -22, transformOrigin: 'right center' });
        gsap.set(pageRight, { rotateY:  22, transformOrigin: 'left center'  });

        // ── Fade in ──────────────────────────────────────────────────────────
        gsap.to(wrap, { opacity, delay, duration: 1.4, ease: 'power2.out' });

        if (reduced) return; // static books only for reduced-motion

        // ── Wing-beat: dramatic page flap ────────────────────────────────────
        // Left page: folds closed (more negative) → snaps open → settles
        const wt = gsap.timeline({ repeat: -1, delay: delay + 0.5 });
        wt.to(pageLeft, { rotateY: -34, duration: wingBeat * 0.30, ease: 'power2.in'   })  // fold in
          .to(pageLeft, { rotateY:  -4, duration: wingBeat * 0.38, ease: 'power2.out'  })  // snap open
          .to(pageLeft, { rotateY: -22, duration: wingBeat * 0.32, ease: 'sine.inOut'  }); // settle

        // Right page: offset ~15% so the two sides aren't perfectly in sync
        wt.to(pageRight, { rotateY: 34, duration: wingBeat * 0.30, ease: 'power2.in'   }, wingBeat * 0.15)
          .to(pageRight, { rotateY:  4, duration: wingBeat * 0.38, ease: 'power2.out'  }, wingBeat * 0.45)
          .to(pageRight, { rotateY: 22, duration: wingBeat * 0.32, ease: 'sine.inOut'  }, wingBeat * 0.83);

        // ── Body bob via yPercent (doesn't conflict with motionPath's y) ────
        gsap.to(wrap, {
          yPercent:  -46,        // lifts visual center by ~4% of element height
          duration:  wingBeat * 0.45,
          ease:      'power2.inOut',
          yoyo:      true,
          repeat:    -1,
          delay:     delay + 0.5 + wingBeat * 0.3,
        });

        // ── Flight loop ──────────────────────────────────────────────────────
        gsap.to(wrap, {
          motionPath: { path, curviness: 1.7 },
          duration, ease: 'none', repeat: -1,
          delay: delay + 0.2,
        });

        // ── Banking (oscillates ±amp, period ≈ 38–50% of flight duration) ───
        gsap.to(wrap, {
          rotation:  bankAmp,
          duration:  duration * (0.18 + Math.random() * 0.08),
          ease:      'sine.inOut',
          yoyo:      true,
          repeat:    -1,
          startAt:   { rotation: -bankAmp * (Math.random() * 0.8) },
          delay:     delay + 0.2 + Math.random() * 2,
        });
      });
    });

    // ── Falling pages (managed outside ctx so DOM creation is tracked) ───────
    if (!reduced) {
      BOOKS.forEach(({ wrap, scale, delay }, i) => {
        const initialDelay = delay + 10 + i * 3 + Math.random() * 6;
        scheduleFalling(wrap, container, scale, initialDelay, cleanupFns.current);
      });
    }

    return () => {
      ctxRef.current?.revert();
      cleanupFns.current.forEach(fn => fn());
      cleanupFns.current = [];
    };
  }, []);

  // ── Fade the whole layer when visibility changes ──────────────────────────
  useEffect(() => {
    gsap.to(containerRef.current, {
      opacity:  visible ? 1 : 0,
      duration: visible ? 0.8 : 1.0,
      ease:     visible ? 'power2.out' : 'power2.in',
    });
  }, [visible]);

  return (
    <div ref={containerRef} className={styles.container} aria-hidden="true">
      <div ref={w1} className={styles.bookWrap}><BookMascot ref={b1} mode="static" /></div>
      <div ref={w2} className={styles.bookWrap}><BookMascot ref={b2} mode="static" /></div>
      <div ref={w3} className={styles.bookWrap}><BookMascot ref={b3} mode="static" /></div>
      <div ref={w4} className={styles.bookWrap}><BookMascot ref={b4} mode="static" /></div>
      <div ref={w5} className={styles.bookWrap}><BookMascot ref={b5} mode="static" /></div>
    </div>
  );
}
