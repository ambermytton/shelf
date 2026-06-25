import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import BookMascot, { type BookMascotHandle } from './BookMascot';
import styles from './IntroLoader.module.css';

gsap.registerPlugin(MotionPathPlugin);

// ── Mote spawn points (fractions of W / H, timed to match the flight arc) ──
const MOTE_SPECS = [
  { xf: 0.62, yf: 0.18, delay: 0.70 },
  { xf: 0.44, yf: 0.28, delay: 1.10 },
  { xf: 0.18, yf: 0.40, delay: 1.55 },
  { xf: 0.34, yf: 0.33, delay: 2.00 },
  { xf: 0.60, yf: 0.23, delay: 2.45 },
  { xf: 0.50, yf: 0.40, delay: 3.00 },
];

interface Props { onDone: () => void; }

export default function IntroLoader({ onDone }: Props) {
  const overlayRef  = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLParagraphElement>(null);
  const hintRef     = useRef<HTMLParagraphElement>(null);
  const bookRef     = useRef<BookMascotHandle>(null);
  const moteRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const doneRef     = useRef(onDone);
  doneRef.current   = onDone;

  useEffect(() => {
    const overlay  = overlayRef.current!;
    const wordmark = wordmarkRef.current!;
    const hint     = hintRef.current!;
    const { root, pageLeft, pageRight } = bookRef.current!;
    const reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const W = window.innerWidth;
    const H = window.innerHeight;

    if (reduced) {
      // Static book, no flying
      gsap.set(root, { opacity: 1 });
      gsap.set([wordmark, hint], { opacity: 1 });
      const t = setTimeout(() => {
        gsap.to(overlay, {
          opacity: 0, duration: 0.4,
          onComplete: () => doneRef.current(),
        });
      }, 1400);
      return () => clearTimeout(t);
    }

    // ── Initial state ──────────────────────────────────────────────────────
    gsap.set(root,     { xPercent: -50, yPercent: -50, x: W * 0.88, y: -90, opacity: 0, scale: 0.72, rotation: 10 });
    gsap.set(pageLeft,  { rotateY: -22, transformOrigin: 'right center' });
    gsap.set(pageRight, { rotateY:  22, transformOrigin: 'left center'  });
    gsap.set([wordmark, hint], { opacity: 0, y: 10 });
    moteRefs.current.forEach((m, i) => {
      if (!m) return;
      const spec = MOTE_SPECS[i];
      m.style.left = `${W * spec.xf + (Math.random() - 0.5) * 28}px`;
      m.style.top  = `${H * spec.yf + (Math.random() - 0.5) * 20}px`;
      gsap.set(m, { opacity: 0, scale: 0, xPercent: -50, yPercent: -50 });
    });

    const ctx = gsap.context(() => {
      // ── Continuous page flutter ──────────────────────────────────────────
      const flutter = gsap.timeline({ repeat: -1 });
      flutter
        .to(pageLeft,  { rotateY: -12, duration: 0.38, ease: 'sine.inOut' })
        .to(pageLeft,  { rotateY: -22, duration: 0.38, ease: 'sine.inOut' });
      flutter
        .to(pageRight, { rotateY:  12, duration: 0.42, ease: 'sine.inOut' }, 0.18)
        .to(pageRight, { rotateY:  22, duration: 0.42, ease: 'sine.inOut' }, 0.60);

      // ── Main flight timeline ────────────────────────────────────────────
      const tl = gsap.timeline({
        onComplete() {
          flutter.kill();
          // Settle pages to open spread
          gsap.to(pageLeft,  { rotateY: -22, duration: 0.3, ease: 'power2.out' });
          gsap.to(pageRight, { rotateY:  22, duration: 0.3, ease: 'power2.out' });

          // Fade in text after book lands
          gsap.to([wordmark, hint], {
            opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.1,
          });

          // Hold, then slide the whole overlay up
          setTimeout(() => {
            overlay.style.boxShadow = '0 8px 56px rgba(41,141,255,0.42), 0 2px 16px rgba(41,141,255,0.22)';
            gsap.to(overlay, {
              y: '-100%', duration: 0.5, ease: 'power2.in',
              onComplete: () => doneRef.current(),
            });
          }, 620);
        },
      });

      // Fade in
      tl.to(root, { opacity: 1, duration: 0.45, ease: 'power2.out' });

      // Flight path — MotionPathPlugin threads through waypoints from current pos
      tl.to(root, {
        motionPath: {
          path: [
            { x: W * 0.60, y: H * 0.18 },
            { x: W * 0.17, y: H * 0.40 },
            { x: W * 0.58, y: H * 0.22 },
            { x: W * 0.50, y: H * 0.43 },
          ],
          curviness: 1.5,
          autoRotate: false,
        },
        scale: 1.0,
        duration: 2.85,
        ease: 'power1.inOut',
      }, 0);

      // Banking (independent rotation synced to arc direction)
      tl.to(root, { rotation: -6,  duration: 0.75, ease: 'power2.out'  }, 0.10);
      tl.to(root, { rotation:  20, duration: 0.95, ease: 'power1.inOut' }, 0.85);
      tl.to(root, { rotation: -16, duration: 0.88, ease: 'power1.inOut' }, 1.78);
      tl.to(root, { rotation:   0, duration: 0.68, ease: 'power2.out'  }, 2.64);

      // Scale for depth feeling (swells as it swoops closer)
      tl.to(root, { scale: 0.82, duration: 0.75 }, 0.10);
      tl.to(root, { scale: 1.05, duration: 0.95 }, 0.85);
      tl.to(root, { scale: 0.90, duration: 0.88 }, 1.78);
      tl.to(root, { scale: 1.00, duration: 0.68 }, 2.64);

      // Motes — sparkle along the flight trail
      moteRefs.current.forEach((m, i) => {
        if (!m) return;
        const delay = MOTE_SPECS[i].delay;
        tl.to(m, { opacity: 0.85, scale: 1, duration: 0.14, ease: 'power2.out' }, delay);
        tl.to(m, { opacity: 0, scale: 0.4, y: -22, duration: 0.52, ease: 'power1.out' }, delay + 0.14);
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div ref={overlayRef} className={styles.overlay}>
      {/* Book flies freely over this layer */}
      <BookMascot ref={bookRef} mode="static" className={styles.flyingBook} />

      {/* Mote particles */}
      {MOTE_SPECS.map((_, i) => (
        <div key={i} ref={el => { moteRefs.current[i] = el; }} className={styles.mote} />
      ))}

      {/* Fixed text — fades in after book settles */}
      <div className={styles.textAnchor}>
        <p ref={wordmarkRef} className={styles.wordmark}>Shelf</p>
        <p ref={hintRef}     className={styles.hint}>Loading your shelf…</p>
      </div>
    </div>
  );
}
