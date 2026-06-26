import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import BookMascot, { type BookMascotHandle } from './BookMascot';
import styles from './FlyingBooks.module.css';

gsap.registerPlugin(MotionPathPlugin);

interface Props { visible: boolean; }

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
type Pt = { x: number; y: number };

// ── A single shed page: standalone glowing shard, animated independently ─────
function spawnFallingPage(
  wrap: HTMLDivElement,
  layer: HTMLDivElement,
  cleanupFns: Array<() => void>,
) {
  const x = gsap.getProperty(wrap, 'x') as number;
  const y = gsap.getProperty(wrap, 'y') as number;
  const s = (gsap.getProperty(wrap, 'scale') as number) || 0.6;

  const el = document.createElement('div');
  el.className = styles.fallingPage;
  el.style.width  = `${Math.max(10, Math.round(20 * s))}px`;
  el.style.height = `${Math.max(13, Math.round(26 * s))}px`;
  layer.appendChild(el);

  const driftX = (Math.random() - 0.5) * 130;
  const fallY  = 80 + Math.random() * 130;
  const rot0   = (Math.random() - 0.5) * 30;
  const rot1   = rot0 + (Math.random() < 0.5 ? -1 : 1) * (150 + Math.random() * 220);
  const dur    = 2.4 + Math.random() * 1.8;

  gsap.set(el, {
    x: x + (Math.random() - 0.5) * 22 * s,
    y: y - 6 * s,
    xPercent: -50, yPercent: -50,
    opacity: 0, rotation: rot0, scale: 0.95,
  });

  const tl = gsap.timeline({ onComplete() { el.remove(); } });
  tl.to(el, { opacity: 0.92, duration: 0.45, ease: 'power2.out' }, 0)
    .to(el, { x: `+=${driftX}`, y: `+=${fallY}`, rotation: rot1, scale: 0.5, duration: dur, ease: 'power1.in' }, 0)
    .to(el, { opacity: 0, duration: dur * 0.55, ease: 'power1.in' }, dur * 0.45);

  cleanupFns.push(() => { tl.kill(); el.remove(); });
}

// ── Recurring page-shedding for one book ─────────────────────────────────────
function scheduleFalling(
  wrap: HTMLDivElement,
  layer: HTMLDivElement,
  visibleRef: React.MutableRefObject<boolean>,
  initialDelay: number,
  cleanupFns: Array<() => void>,
) {
  let timer: gsap.core.Tween | null = null;

  function next() {
    const interval = 9 + Math.random() * 8; // 9–17 s between pages (occasional)
    timer = gsap.delayedCall(interval, () => {
      if (visibleRef.current) spawnFallingPage(wrap, layer, cleanupFns);
      next();
    });
  }

  // First shed soon after arrival so it's clearly demonstrated, then settle
  const first = gsap.delayedCall(initialDelay, () => {
    if (visibleRef.current) spawnFallingPage(wrap, layer, cleanupFns);
    next();
  });
  cleanupFns.push(() => { first.kill(); timer?.kill(); });
}

// ── Firefly glow: recursive random flicker on --glow-flicker ─────────────────
function fireflyFlicker(wrap: HTMLDivElement, cleanupFns: Array<() => void>) {
  let t: gsap.core.Tween | null = null;
  function pulse() {
    t = gsap.to(wrap, {
      '--glow-flicker': 0.78 + Math.random() * 0.5, // 0.78–1.28
      duration: 0.5 + Math.random() * 1.1,
      ease: 'sine.inOut',
      onComplete: pulse,
    });
  }
  pulse();
  cleanupFns.push(() => t?.kill());
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FlyingBooks({ visible }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const pagesLayerRef = useRef<HTMLDivElement>(null);
  const visibleRef    = useRef(visible);

  const w1 = useRef<HTMLDivElement>(null);  const b1 = useRef<BookMascotHandle>(null);
  const w2 = useRef<HTMLDivElement>(null);  const b2 = useRef<BookMascotHandle>(null);
  const w3 = useRef<HTMLDivElement>(null);  const b3 = useRef<BookMascotHandle>(null);
  const w4 = useRef<HTMLDivElement>(null);  const b4 = useRef<BookMascotHandle>(null);
  const w5 = useRef<HTMLDivElement>(null);  const b5 = useRef<BookMascotHandle>(null);

  const ctxRef     = useRef<gsap.Context | null>(null);
  const cleanupFns = useRef<Array<() => void>>([]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W = window.innerWidth;
    const H = window.innerHeight - 52; // exclude navbar
    const layer = pagesLayerRef.current!;

    // Controlled depth lanes — start positions OFF-SCREEN, loops hug the
    // periphery so the centred "Welcome" copy stays clear.
    const CONFIGS = [
      { // 1 — foreground hero: swoops in top-right, big left-side passes
        wrap: w1.current!, mascot: b1.current!,
        start: { x: 1.15 * W, y: -0.20 * H }, ctrl: { x: 0.66 * W, y: 0.16 * H },
        loop: [
          { x: 0.18 * W, y: 0.42 * H }, { x: 0.09 * W, y: 0.22 * H },
          { x: 0.28 * W, y: 0.12 * H }, { x: 0.30 * W, y: 0.50 * H },
          { x: 0.12 * W, y: 0.64 * H },
        ],
        base: 0.80, near: 1.16, far: 0.62, mid: 0.94,
        loopDur: 27, wingBeat: 3.6, bankAmp: 10, turnAmp: 14,
        entranceDelay: 0.3, entranceDur: 3.1,
      },
      { // 2 — mid, lower-left circuit
        wrap: w2.current!, mascot: b2.current!,
        start: { x: -0.22 * W, y: 0.72 * H }, ctrl: { x: 0.10 * W, y: 0.86 * H },
        loop: [
          { x: 0.20 * W, y: 0.74 * H }, { x: 0.08 * W, y: 0.82 * H },
          { x: 0.24 * W, y: 0.90 * H }, { x: 0.36 * W, y: 0.76 * H },
          { x: 0.22 * W, y: 0.64 * H },
        ],
        base: 0.58, near: 0.80, far: 0.46, mid: 0.67,
        loopDur: 21, wingBeat: 2.7, bankAmp: 13, turnAmp: 16,
        entranceDelay: 1.7, entranceDur: 2.9,
      },
      { // 3 — large-mid, big diagonal pass to upper-right, right-side loop
        wrap: w3.current!, mascot: b3.current!,
        start: { x: 1.22 * W, y: 1.12 * H }, ctrl: { x: 0.86 * W, y: 0.54 * H },
        loop: [
          { x: 0.84 * W, y: 0.32 * H }, { x: 0.93 * W, y: 0.20 * H },
          { x: 0.78 * W, y: 0.50 * H }, { x: 0.88 * W, y: 0.66 * H },
          { x: 0.96 * W, y: 0.44 * H },
        ],
        base: 0.70, near: 1.02, far: 0.54, mid: 0.85,
        loopDur: 24, wingBeat: 3.1, bankAmp: 11, turnAmp: 13,
        entranceDelay: 0.9, entranceDur: 3.3,
      },
      { // 4 — drifts across the top, above the copy
        wrap: w4.current!, mascot: b4.current!,
        start: { x: -0.16 * W, y: -0.22 * H }, ctrl: { x: 0.30 * W, y: 0.07 * H },
        loop: [
          { x: 0.50 * W, y: 0.11 * H }, { x: 0.30 * W, y: 0.06 * H },
          { x: 0.16 * W, y: 0.15 * H }, { x: 0.64 * W, y: 0.05 * H },
          { x: 0.82 * W, y: 0.13 * H },
        ],
        base: 0.52, near: 0.72, far: 0.42, mid: 0.60,
        loopDur: 23, wingBeat: 2.4, bankAmp: 9, turnAmp: 12,
        entranceDelay: 2.5, entranceDur: 3.0,
      },
      { // 5 — smaller (not tiny), lower-right circuit
        wrap: w5.current!, mascot: b5.current!,
        start: { x: 1.18 * W, y: 0.55 * H }, ctrl: { x: 0.82 * W, y: 0.62 * H },
        loop: [
          { x: 0.72 * W, y: 0.74 * H }, { x: 0.80 * W, y: 0.66 * H },
          { x: 0.88 * W, y: 0.82 * H }, { x: 0.66 * W, y: 0.85 * H },
          { x: 0.70 * W, y: 0.70 * H },
        ],
        base: 0.47, near: 0.65, far: 0.39, mid: 0.55,
        loopDur: 19, wingBeat: 2.1, bankAmp: 12, turnAmp: 14,
        entranceDelay: 3.1, entranceDur: 2.7,
      },
    ];

    ctxRef.current = gsap.context(() => {
      CONFIGS.forEach((cfg) => {
        const { wrap, mascot, start, ctrl, loop, base, near, far, mid,
                loopDur, wingBeat, bankAmp, turnAmp, entranceDelay, entranceDur } = cfg;
        const pageLeft  = mascot.pageLeft;
        const pageRight = mascot.pageRight;
        const arrival   = loop[0] as Pt;
        const loopPath  = [...loop, arrival]; // closed for seamless repeat

        // Open spread to begin
        gsap.set(pageLeft,  { rotateY: -22, transformOrigin: 'right center' });
        gsap.set(pageRight, { rotateY:  22, transformOrigin: 'left center'  });

        // ── Reduced motion: place static on-screen, steady glow, no motion ──
        if (reduced) {
          gsap.set(wrap, {
            xPercent: -50, yPercent: -50,
            x: arrival.x, y: arrival.y,
            scale: base, opacity: 1, rotation: bankAmp * 0.4,
            '--glow-depth': 1, '--glow-flicker': 1,
          });
          return;
        }

        // ── Initial state: fully off-screen, full opacity (never fades in place) ──
        gsap.set(wrap, {
          transformPerspective: 720,
          xPercent: -50, yPercent: -50,
          x: start.x, y: start.y,
          scale: far, opacity: 1, rotation: bankAmp,
          '--glow-depth': 0.7, '--glow-flicker': 1,
        });

        // ── Entrance: curved swoop from off-screen edge to the loop start ──
        gsap.to(wrap, {
          motionPath: { path: [ctrl, arrival], curviness: 1.5, autoRotate: false },
          scale: base,
          duration: entranceDur,
          ease: 'power2.out',
          delay: entranceDelay,
        });

        const loopStart = entranceDelay + entranceDur;

        // ── Continuous flight loop ──────────────────────────────────────────
        gsap.to(wrap, {
          motionPath: { path: loopPath, curviness: 1.7, autoRotate: false },
          duration: loopDur, ease: 'none', repeat: -1,
          delay: loopStart,
        });

        // ── Depth: scale + glow-depth swell (close foreground pass) & recede ──
        const depthTl = gsap.timeline({ repeat: -1, delay: loopStart });
        depthTl
          .to(wrap, { scale: near, '--glow-depth': 1.4,  duration: loopDur * 0.24, ease: 'sine.inOut' })
          .to(wrap, { scale: far,  '--glow-depth': 0.68, duration: loopDur * 0.30, ease: 'sine.inOut' })
          .to(wrap, { scale: mid,  '--glow-depth': 1.08, duration: loopDur * 0.26, ease: 'sine.inOut' })
          .to(wrap, { scale: base, '--glow-depth': 0.92, duration: loopDur * 0.20, ease: 'sine.inOut' });

        // ── Banking tilt (z) + 3D turn (rotationY) — varied phase per book ──
        gsap.to(wrap, {
          rotation: -bankAmp,
          duration: loopDur * rnd(0.16, 0.26), ease: 'sine.inOut',
          yoyo: true, repeat: -1, delay: loopStart - rnd(0, 1.5),
        });
        gsap.to(wrap, {
          rotationY: turnAmp,
          duration: loopDur * rnd(0.18, 0.30), ease: 'sine.inOut',
          yoyo: true, repeat: -1,
          startAt: { rotationY: -turnAmp }, delay: entranceDelay,
        });

        // ── Wing-beat: page-halves flap (begins during the swoop-in) ────────
        const wt = gsap.timeline({ repeat: -1, delay: entranceDelay + 0.2 });
        wt.to(pageLeft, { rotateY: -36, duration: wingBeat * 0.30, ease: 'power2.in'  })
          .to(pageLeft, { rotateY:  -3, duration: wingBeat * 0.38, ease: 'power2.out' })
          .to(pageLeft, { rotateY: -22, duration: wingBeat * 0.32, ease: 'sine.inOut' });
        wt.to(pageRight, { rotateY: 36, duration: wingBeat * 0.30, ease: 'power2.in'  }, wingBeat * 0.15)
          .to(pageRight, { rotateY:  3, duration: wingBeat * 0.38, ease: 'power2.out' }, wingBeat * 0.45)
          .to(pageRight, { rotateY: 22, duration: wingBeat * 0.32, ease: 'sine.inOut' }, wingBeat * 0.83);

        // ── Living firefly glow flicker ─────────────────────────────────────
        fireflyFlicker(wrap, cleanupFns.current);

        // ── Page shedding — first shortly after arrival, then occasional ────
        scheduleFalling(wrap, layer, visibleRef, loopStart + rnd(3, 7), cleanupFns.current);
      });
    });

    return () => {
      ctxRef.current?.revert();
      cleanupFns.current.forEach(fn => fn());
      cleanupFns.current = [];
    };
  }, []);

  // ── Fade whole layer in / out; gate shedding via visibleRef ───────────────
  useEffect(() => {
    visibleRef.current = visible;
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
      <div ref={pagesLayerRef} className={styles.pagesLayer} />
    </div>
  );
}
