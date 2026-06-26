import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import BookMascot, { type BookMascotHandle } from './BookMascot';
import styles from './FlyingBooks.module.css';

gsap.registerPlugin(MotionPathPlugin);

interface Props { visible: boolean; }

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const rndInt = (min: number, max: number) => Math.floor(rnd(min, max + 1));

// ── Falling page particle ────────────────────────────────────────────────────
function spawnFallingPage(
  wrap: HTMLDivElement,
  container: HTMLDivElement,
  bookScale: number,
  cleanupFns: Array<() => void>,
) {
  const x = gsap.getProperty(wrap, 'x') as number;
  const y = gsap.getProperty(wrap, 'y') as number;

  const el = document.createElement('div');
  const pw = Math.round(18 * bookScale);
  const ph = Math.round(23 * bookScale);
  Object.assign(el.style, {
    position:     'absolute',
    top:          '0',
    left:         '0',
    width:        `${pw}px`,
    height:       `${ph}px`,
    background:   'linear-gradient(128deg, rgba(22,50,105,0.92) 0%, rgba(10,22,52,0.96) 55%, rgba(6,12,34,1) 100%)',
    border:       '1px solid rgba(41,141,255,0.32)',
    borderRadius: '1px',
    boxShadow:    '0 0 6px rgba(41,141,255,0.65), 0 0 18px rgba(41,141,255,0.25)',
    pointerEvents: 'none',
  });
  container.appendChild(el);

  const offsetX = (Math.random() - 0.5) * 28 * bookScale;
  const driftX  = (Math.random() - 0.5) * 100;
  const fallY   = 90 + Math.random() * 90;
  const rot0    = (Math.random() - 0.5) * 20;
  const rot1    = rot0 + (Math.random() - 0.5) * 210;
  const dur     = 1.8 + Math.random() * 1.5;

  gsap.set(el, {
    x: x + offsetX, y: y - 8 * bookScale,
    xPercent: -50,  yPercent: -50,
    opacity: 0.85,  rotation: rot0,
    scale: 0.85 + Math.random() * 0.3,
  });

  const tween = gsap.to(el, {
    x: x + offsetX + driftX,
    y: y - 8 * bookScale + fallY,
    opacity: 0, rotation: rot1, scale: 0.3,
    duration: dur, ease: 'power1.in',
    onComplete() { el.remove(); },
  });

  cleanupFns.push(() => { tween.kill(); el.remove(); });
}

// ── Recurring page-shedding scheduler ────────────────────────────────────────
function scheduleFalling(
  wrap: HTMLDivElement,
  container: HTMLDivElement,
  bookScale: number,
  initialDelay: number,
  cleanupFns: Array<() => void>,
) {
  let timer: gsap.core.Tween | null = null;

  function next() {
    const interval = 9 + Math.random() * 13;
    timer = gsap.delayedCall(interval, () => {
      const opacity = gsap.getProperty(wrap, 'opacity') as number;
      if (opacity > 0.08) spawnFallingPage(wrap, container, bookScale, cleanupFns);
      next();
    });
  }

  const first = gsap.delayedCall(initialDelay, next);
  cleanupFns.push(() => { first.kill(); timer?.kill(); });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FlyingBooks({ visible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 8 wrapper refs (what GSAP moves) + 8 mascot refs (page access)
  const w1 = useRef<HTMLDivElement>(null);  const b1 = useRef<BookMascotHandle>(null);
  const w2 = useRef<HTMLDivElement>(null);  const b2 = useRef<BookMascotHandle>(null);
  const w3 = useRef<HTMLDivElement>(null);  const b3 = useRef<BookMascotHandle>(null);
  const w4 = useRef<HTMLDivElement>(null);  const b4 = useRef<BookMascotHandle>(null);
  const w5 = useRef<HTMLDivElement>(null);  const b5 = useRef<BookMascotHandle>(null);
  const w6 = useRef<HTMLDivElement>(null);  const b6 = useRef<BookMascotHandle>(null);
  const w7 = useRef<HTMLDivElement>(null);  const b7 = useRef<BookMascotHandle>(null);
  const w8 = useRef<HTMLDivElement>(null);  const b8 = useRef<BookMascotHandle>(null);

  const ctxRef     = useRef<gsap.Context | null>(null);
  const cleanupFns = useRef<Array<() => void>>([]);

  useEffect(() => {
    const reduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W         = window.innerWidth;
    const H         = window.innerHeight - 52;
    const container = containerRef.current!;

    // Pair wraps with their mascot refs
    const PAIRS = [
      [w1.current!, b1.current!], [w2.current!, b2.current!],
      [w3.current!, b3.current!], [w4.current!, b4.current!],
      [w5.current!, b5.current!], [w6.current!, b6.current!],
      [w7.current!, b7.current!], [w8.current!, b8.current!],
    ] as const;

    // Generate all book configs randomly at mount time
    const BOOKS = PAIRS.map(([wrap, mascot]) => {
      const scale    = rnd(0.28, 0.88);
      const opacity  = rnd(0.42, 0.70);          // brighter than before
      const duration = rnd(8,  30);               // wide speed range
      const delay    = rnd(0,  20);               // fully random stagger
      const wingBeat = rnd(1.1, 4.4);             // flap speed
      const bankAmp  = rnd(5,  16);               // tilt amount

      const startX = rnd(0.05, 0.95) * W;
      const startY = rnd(0.05, 0.90) * H;

      // Random looping path (4–7 interior waypoints + closing point)
      const numPts = rndInt(4, 7);
      const path = [
        ...Array.from({ length: numPts }, () => ({
          x: rnd(0.04, 0.96) * W,
          y: rnd(0.04, 0.92) * H,
        })),
        { x: startX, y: startY }, // close the loop
      ];

      return {
        wrap, pageLeft: mascot.pageLeft, pageRight: mascot.pageRight,
        scale, opacity, duration, delay, wingBeat, bankAmp,
        startX, startY, path,
      };
    });

    ctxRef.current = gsap.context(() => {
      BOOKS.forEach(({ wrap, pageLeft, pageRight, scale, opacity, duration, delay, wingBeat, bankAmp, startX, startY, path }) => {

        // ── Initial placement ──────────────────────────────────────────────
        gsap.set(wrap, {
          xPercent: -50, yPercent: -50,
          x: startX, y: startY,
          scale, opacity: 0, rotation: 0,
        });
        gsap.set(pageLeft,  { rotateY: -22, transformOrigin: 'right center' });
        gsap.set(pageRight, { rotateY:  22, transformOrigin: 'left center'  });

        // ── Fade in ────────────────────────────────────────────────────────
        gsap.to(wrap, { opacity, delay, duration: rnd(1.0, 1.8), ease: 'power2.out' });

        if (reduced) return;

        // ── Wing-beat: left page folds in → snaps wide → settles ──────────
        const wt = gsap.timeline({ repeat: -1, delay: delay + rnd(0.2, 0.8) });
        wt.to(pageLeft, { rotateY: -34, duration: wingBeat * 0.30, ease: 'power2.in'  })
          .to(pageLeft, { rotateY:  -4, duration: wingBeat * 0.38, ease: 'power2.out' })
          .to(pageLeft, { rotateY: -22, duration: wingBeat * 0.32, ease: 'sine.inOut' });

        // Right page: offset ~15% of beat so sides are never perfectly synced
        wt.to(pageRight, { rotateY: 34, duration: wingBeat * 0.30, ease: 'power2.in'  }, wingBeat * 0.15)
          .to(pageRight, { rotateY:  4, duration: wingBeat * 0.38, ease: 'power2.out' }, wingBeat * 0.45)
          .to(pageRight, { rotateY: 22, duration: wingBeat * 0.32, ease: 'sine.inOut' }, wingBeat * 0.83);

        // ── Body lift via yPercent (doesn't conflict with motionPath y) ───
        gsap.to(wrap, {
          yPercent:  -46,
          duration:  wingBeat * 0.45,
          ease:      'power2.inOut',
          yoyo:      true,
          repeat:    -1,
          delay:     delay + wingBeat * rnd(0.2, 0.4),
        });

        // ── Infinite flight loop ───────────────────────────────────────────
        gsap.to(wrap, {
          motionPath: { path, curviness: rnd(1.4, 2.0) },
          duration, ease: 'none', repeat: -1,
          delay: delay + 0.2,
        });

        // ── Banking: random oscillation period, random start phase ─────────
        gsap.to(wrap, {
          rotation:  bankAmp,
          duration:  duration * rnd(0.14, 0.28),
          ease:      'sine.inOut',
          yoyo:      true,
          repeat:    -1,
          startAt:   { rotation: rnd(-bankAmp, bankAmp) },
          delay:     delay + rnd(0.2, 2.5),
        });
      });
    });

    // ── Falling pages (outside ctx; DOM creation tracked separately) ──────
    if (!reduced) {
      BOOKS.forEach(({ wrap, scale, delay }, i) => {
        const firstPage = delay + rnd(8, 16) + i * rnd(1, 3);
        scheduleFalling(wrap, container, scale, firstPage, cleanupFns.current);
      });
    }

    return () => {
      ctxRef.current?.revert();
      cleanupFns.current.forEach(fn => fn());
      cleanupFns.current = [];
    };
  }, []);

  // ── Fade whole layer in / out ─────────────────────────────────────────────
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
      <div ref={w6} className={styles.bookWrap}><BookMascot ref={b6} mode="static" /></div>
      <div ref={w7} className={styles.bookWrap}><BookMascot ref={b7} mode="static" /></div>
      <div ref={w8} className={styles.bookWrap}><BookMascot ref={b8} mode="static" /></div>
    </div>
  );
}
