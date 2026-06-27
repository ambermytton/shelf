import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import BookMascot, { type BookMascotHandle } from './BookMascot';
import styles from './FlyingBooks.module.css';

gsap.registerPlugin(MotionPathPlugin);

interface Props { visible: boolean; }

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
type Pt = { x: number; y: number };

// ── A single shed page: a standalone glowing sheet of paper that flutters down
//    like a leaf — sways side to side, tumbles on multiple axes, varies its fall
//    speed catching air, then fades out before reaching the edges. ─────────────
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
  // Paper proportions — a thin sheet, clearly taller than wide (~1:1.55)
  const pw = Math.max(9,  Math.round(14 * s));
  const ph = Math.max(15, Math.round(22 * s));
  el.style.width  = `${pw}px`;
  el.style.height = `${ph}px`;
  layer.appendChild(el);

  const startX = x + (Math.random() - 0.5) * 20 * s;
  const startY = y - 4 * s;
  const dir    = Math.random() < 0.5 ? -1 : 1;   // initial sway direction
  const sway   = 14 + Math.random() * 22;         // how far it rocks sideways
  const fallY  = 95 + Math.random() * 130;        // total descent
  const dur    = 3.0 + Math.random() * 2.4;       // slow, leaf-like

  gsap.set(el, {
    x: startX, y: startY,
    xPercent: -50, yPercent: -50,
    transformPerspective: 420,
    transformOrigin: '50% 40%',
    opacity: 0,
    scale: 0.9 + Math.random() * 0.2,
    rotation:  (Math.random() - 0.5) * 36,
    rotationX: (Math.random() - 0.5) * 40,
    rotationY: (Math.random() - 0.5) * 60,
  });

  const tl = gsap.timeline({ onComplete() { el.remove(); } });

  // Fade in as it detaches
  tl.to(el, { opacity: 0.88, duration: 0.5, ease: 'power2.out' }, 0);

  // Leaf descent in three rocking segments — accelerate, catch air & drift the
  // other way, then fall again. Each segment sets an absolute x so it sways.
  tl.to(el, { y: startY + fallY * 0.32, x: startX + dir * sway,       duration: dur * 0.32, ease: 'sine.in'    }, 0)
    .to(el, { y: startY + fallY * 0.63, x: startX - dir * sway * 1.2, duration: dur * 0.34, ease: 'sine.inOut' }, dur * 0.32)
    .to(el, { y: startY + fallY,        x: startX + dir * sway * 0.7, duration: dur * 0.34, ease: 'sine.in'    }, dur * 0.66);

  // Continuous multi-axis tumble across the whole fall (3D, catching the light)
  tl.to(el, { rotation:  `+=${dir * (140 + Math.random() * 180)}`, duration: dur, ease: 'none' }, 0)
    .to(el, { rotationX: `+=${190 + Math.random() * 240}`,         duration: dur, ease: 'none' }, 0)
    .to(el, { rotationY: `+=${dir * (170 + Math.random() * 220)}`, duration: dur, ease: 'none' }, 0);

  // Fade out before it reaches the edges
  tl.to(el, { opacity: 0, duration: dur * 0.42, ease: 'power1.in' }, dur * 0.58);

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
        loopDur: 27, wingBeat: 1.5, bankAmp: 10, turnAmp: 14,
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
        loopDur: 21, wingBeat: 1.3, bankAmp: 13, turnAmp: 16,
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
        loopDur: 24, wingBeat: 1.6, bankAmp: 11, turnAmp: 13,
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
        loopDur: 23, wingBeat: 1.2, bankAmp: 9, turnAmp: 12,
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
        loopDur: 19, wingBeat: 1.1, bankAmp: 12, turnAmp: 14,
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

        // Open spread to begin (GSAP property is rotationY, not rotateY)
        gsap.set(pageLeft,  { rotationY: -22, transformOrigin: 'right center' });
        gsap.set(pageRight, { rotationY:  22, transformOrigin: 'left center'  });

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

        // ── Wing-beat: page-halves flap like wings (continuous, begins on swoop-in) ──
        // Each half folds closed → snaps wide open → eases back to rest, the two
        // sides offset so it reads as a living flutter rather than a clap.
        const wt = gsap.timeline({ repeat: -1, delay: entranceDelay + 0.2 });
        wt.to(pageLeft, { rotationY: -40, duration: wingBeat * 0.28, ease: 'power2.in'  })
          .to(pageLeft, { rotationY:  -5, duration: wingBeat * 0.40, ease: 'power2.out' })
          .to(pageLeft, { rotationY: -22, duration: wingBeat * 0.32, ease: 'sine.inOut' });
        wt.to(pageRight, { rotationY: 40, duration: wingBeat * 0.28, ease: 'power2.in'  }, wingBeat * 0.12)
          .to(pageRight, { rotationY:  5, duration: wingBeat * 0.40, ease: 'power2.out' }, wingBeat * 0.42)
          .to(pageRight, { rotationY: 22, duration: wingBeat * 0.32, ease: 'sine.inOut' }, wingBeat * 0.82);

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
