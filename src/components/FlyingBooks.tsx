import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import BookMascot, { type BookMascotHandle } from './BookMascot';
import styles from './FlyingBooks.module.css';

gsap.registerPlugin(MotionPathPlugin);

interface Props {
  visible: boolean;
}

export default function FlyingBooks({ visible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Wrapper refs (what GSAP moves along the path)
  const w1 = useRef<HTMLDivElement>(null);
  const w2 = useRef<HTMLDivElement>(null);
  const w3 = useRef<HTMLDivElement>(null);

  // BookMascot refs (for page flutter access)
  const b1 = useRef<BookMascotHandle>(null);
  const b2 = useRef<BookMascotHandle>(null);
  const b3 = useRef<BookMascotHandle>(null);

  const ctxRef = useRef<gsap.Context | null>(null);

  // ── Set up flight animations once on mount ──────────────────────────────
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W = window.innerWidth;
    const H = window.innerHeight - 52; // subtract navbar

    const books = [
      // Book 1 — large, slow, sweeps left side and upper screen
      {
        wrap:      w1.current!,
        pageLeft:  b1.current!.pageLeft,
        pageRight: b1.current!.pageRight,
        scale:     0.78,
        opacity:   0.48,
        duration:  24,
        delay:     0,
        flutter:   3.4,
        startX:    W * 0.12,
        startY:    H * 0.38,
        path: [
          { x: W * 0.06, y: H * 0.20 },
          { x: W * 0.24, y: H * 0.10 },
          { x: W * 0.28, y: H * 0.48 },
          { x: W * 0.14, y: H * 0.65 },
          { x: W * 0.05, y: H * 0.50 },
          { x: W * 0.12, y: H * 0.38 }, // close loop
        ],
        rotations: [
          { r: -8,  at: 0.05 },
          { r:  14, at: 0.28 },
          { r: -10, at: 0.55 },
          { r:   6, at: 0.80 },
          { r:   0, at: 0.98 },
        ],
      },
      // Book 2 — medium, moderate speed, right side
      {
        wrap:      w2.current!,
        pageLeft:  b2.current!.pageLeft,
        pageRight: b2.current!.pageRight,
        scale:     0.58,
        opacity:   0.36,
        duration:  17,
        delay:     6,
        flutter:   2.6,
        startX:    W * 0.84,
        startY:    H * 0.30,
        path: [
          { x: W * 0.92, y: H * 0.18 },
          { x: W * 0.76, y: H * 0.52 },
          { x: W * 0.86, y: H * 0.70 },
          { x: W * 0.95, y: H * 0.46 },
          { x: W * 0.84, y: H * 0.30 }, // close loop
        ],
        rotations: [
          { r:  10, at: 0.06 },
          { r: -12, at: 0.32 },
          { r:   8, at: 0.62 },
          { r:  -6, at: 0.88 },
          { r:   0, at: 0.98 },
        ],
      },
      // Book 3 — small, faster, bottom-left corner
      {
        wrap:      w3.current!,
        pageLeft:  b3.current!.pageLeft,
        pageRight: b3.current!.pageRight,
        scale:     0.44,
        opacity:   0.28,
        duration:  13,
        delay:     10,
        flutter:   2.0,
        startX:    W * 0.18,
        startY:    H * 0.74,
        path: [
          { x: W * 0.08, y: H * 0.80 },
          { x: W * 0.22, y: H * 0.88 },
          { x: W * 0.32, y: H * 0.76 },
          { x: W * 0.24, y: H * 0.64 },
          { x: W * 0.12, y: H * 0.68 },
          { x: W * 0.18, y: H * 0.74 }, // close loop
        ],
        rotations: [
          { r: -12, at: 0.08 },
          { r:  10, at: 0.35 },
          { r:  -8, at: 0.65 },
          { r:   6, at: 0.88 },
          { r:   0, at: 0.98 },
        ],
      },
    ];

    ctxRef.current = gsap.context(() => {
      books.forEach(({ wrap, pageLeft, pageRight, scale, opacity, duration, delay, flutter, startX, startY, path, rotations }) => {
        // Initial placement — invisible at start position
        gsap.set(wrap, {
          xPercent: -50,
          yPercent: -50,
          x: startX,
          y: startY,
          scale,
          opacity: 0,
          rotation: 0,
        });
        gsap.set(pageLeft,  { rotateY: -22, transformOrigin: 'right center' });
        gsap.set(pageRight, { rotateY:  22, transformOrigin: 'left center' });

        if (reduced) {
          // Static: show book at rest position, no motion
          gsap.to(wrap, { opacity, delay, duration: 0.8, ease: 'power2.out' });
          return;
        }

        // Fade in with individual delay so they don't all appear at once
        gsap.to(wrap, { opacity, delay, duration: 1.2, ease: 'power2.out' });

        // Page flutter — unique speed per book, offset left/right pages
        const flutterTl = gsap.timeline({ repeat: -1, delay: delay + 0.4 });
        flutterTl
          .to(pageLeft,  { rotateY: -10, duration: flutter * 0.38, ease: 'sine.inOut' })
          .to(pageLeft,  { rotateY: -22, duration: flutter * 0.38, ease: 'sine.inOut' });
        flutterTl
          .to(pageRight, { rotateY:  10, duration: flutter * 0.42, ease: 'sine.inOut' }, flutter * 0.18)
          .to(pageRight, { rotateY:  22, duration: flutter * 0.42, ease: 'sine.inOut' }, flutter * 0.60);

        // Infinite flight loop
        gsap.to(wrap, {
          motionPath: { path, curviness: 1.7 },
          duration,
          ease: 'none',
          repeat: -1,
          delay: delay + 0.2,
        });

        // Banking rotation — timed to the loop duration (fractions of duration)
        const bankTl = gsap.timeline({ repeat: -1, delay: delay + 0.2 });
        rotations.forEach(({ r, at }, i) => {
          const prev = i === 0 ? 0 : rotations[i - 1].at;
          bankTl.to(wrap, {
            rotation: r,
            duration: (at - prev) * duration,
            ease: 'sine.inOut',
          });
        });
      });
    });

    return () => ctxRef.current?.revert();
  }, []);

  // ── Fade container in / out when visibility changes ──────────────────────
  useEffect(() => {
    gsap.to(containerRef.current, {
      opacity:  visible ? 1 : 0,
      duration: visible ? 0.8 : 1.0,
      ease:     visible ? 'power2.out' : 'power2.in',
    });
  }, [visible]);

  return (
    <div ref={containerRef} className={styles.container} aria-hidden="true">
      <div ref={w1} className={styles.bookWrap}>
        <BookMascot ref={b1} mode="static" />
      </div>
      <div ref={w2} className={styles.bookWrap}>
        <BookMascot ref={b2} mode="static" />
      </div>
      <div ref={w3} className={styles.bookWrap}>
        <BookMascot ref={b3} mode="static" />
      </div>
    </div>
  );
}
