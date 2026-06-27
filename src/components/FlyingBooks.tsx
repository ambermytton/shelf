import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import BookMascot, { type BookMascotHandle } from './BookMascot';
import styles from './FlyingBooks.module.css';

gsap.registerPlugin(MotionPathPlugin);

interface Props { visible: boolean; }

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
type Pt = { x: number; y: number };

// ── Fairy-dust sparkle: a tiny electric-blue glitter that trails the book,
//    twinkles up, drifts a touch, then fades. Kept small and delicate. ─────────
function spawnSparkle(
  wrap: HTMLDivElement,
  layer: HTMLDivElement,
  cleanupFns: Array<() => void>,
) {
  const x = gsap.getProperty(wrap, 'x') as number;
  const y = gsap.getProperty(wrap, 'y') as number;
  const s = (gsap.getProperty(wrap, 'scale') as number) || 0.6;

  const el = document.createElement('div');
  el.className = styles.sparkle;
  const size = (1.6 + Math.random() * 2.4) * (0.55 + s);
  el.style.width  = `${size.toFixed(1)}px`;
  el.style.height = `${size.toFixed(1)}px`;
  layer.appendChild(el);

  const ox = (Math.random() - 0.5) * 30 * s;
  const oy = (Math.random() - 0.5) * 26 * s;
  const driftX = (Math.random() - 0.5) * 20;
  const driftY = 6 + Math.random() * 18;
  const dur = 0.7 + Math.random() * 0.9;

  gsap.set(el, {
    x: x + ox, y: y + oy,
    xPercent: -50, yPercent: -50,
    opacity: 0, scale: 0.3,
  });

  const tl = gsap.timeline({ onComplete() { el.remove(); } });
  tl.to(el, { opacity: rnd(0.7, 1), scale: 1, duration: dur * 0.3, ease: 'power2.out' }, 0)
    .to(el, { x: `+=${driftX}`, y: `+=${driftY}`, duration: dur, ease: 'sine.out' }, 0)
    .to(el, { opacity: 0, scale: 0.2, duration: dur * 0.65, ease: 'power1.in' }, dur * 0.35);

  cleanupFns.push(() => { tl.kill(); el.remove(); });
}

// ── Recurring sparkle emission for one book — delicate cadence ───────────────
function scheduleSparkles(
  wrap: HTMLDivElement,
  layer: HTMLDivElement,
  visibleRef: React.MutableRefObject<boolean>,
  initialDelay: number,
  cleanupFns: Array<() => void>,
) {
  let timer: gsap.core.Tween | null = null;
  function next() {
    const interval = 0.16 + Math.random() * 0.30; // ~3–6 sparkles/sec, then they fade
    timer = gsap.delayedCall(interval, () => {
      if (visibleRef.current) spawnSparkle(wrap, layer, cleanupFns);
      next();
    });
  }
  const first = gsap.delayedCall(initialDelay, next);
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
  const containerRef   = useRef<HTMLDivElement>(null);
  const sparkleLayerRef = useRef<HTMLDivElement>(null);
  const visibleRef     = useRef(visible);

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
    const layer = sparkleLayerRef.current!;

    // Controlled depth lanes — start OFF-SCREEN, loops hug the periphery so the
    // centred "Welcome" copy stays clear. `pitch` is the from-above tilt (deg)
    // that turns the flat open book into a 3/4 bird's-eye view: spine = body
    // ridge, page-halves = wings.
    // Each book darts ACROSS the screen on a wide sweeping path (enters off one
    // edge, traverses, grazes the far edge, sweeps back) so it reads as flying
    // past — not hovering. `pitch` is a small forward tilt only (the spine is
    // held horizontal by the .flyingOrient 90° rotation); `bankAmp` rolls it as
    // it turns. Faster loopDur = more darting.
    const CONFIGS = [
      { // 1 — large, wide sweep across the upper third
        wrap: w1.current!, mascot: b1.current!,
        start: { x: 1.25 * W, y: 0.20 * H }, ctrl: { x: 0.70 * W, y: 0.12 * H },
        loop: [
          { x: 0.08 * W, y: 0.26 * H }, { x: 0.34 * W, y: 0.13 * H },
          { x: 0.66 * W, y: 0.24 * H }, { x: 0.93 * W, y: 0.12 * H },
          { x: 0.62 * W, y: 0.30 * H }, { x: 0.30 * W, y: 0.18 * H },
        ],
        base: 0.78, near: 1.04, far: 0.66, mid: 0.90,
        loopDur: 14, wingBeat: 0.62, bankAmp: 14, pitch: 16,
        entranceDelay: 0.3, entranceDur: 2.4,
      },
      { // 2 — mid, wide sweep across the lower third
        wrap: w2.current!, mascot: b2.current!,
        start: { x: -0.28 * W, y: 0.78 * H }, ctrl: { x: 0.14 * W, y: 0.84 * H },
        loop: [
          { x: 0.12 * W, y: 0.74 * H }, { x: 0.40 * W, y: 0.86 * H },
          { x: 0.70 * W, y: 0.71 * H }, { x: 0.93 * W, y: 0.83 * H },
          { x: 0.58 * W, y: 0.76 * H }, { x: 0.28 * W, y: 0.88 * H },
        ],
        base: 0.58, near: 0.78, far: 0.47, mid: 0.66,
        loopDur: 12, wingBeat: 0.54, bankAmp: 16, pitch: 14,
        entranceDelay: 1.4, entranceDur: 2.2,
      },
      { // 3 — large-mid, big diagonal sweep corner to corner
        wrap: w3.current!, mascot: b3.current!,
        start: { x: 1.28 * W, y: 0.95 * H }, ctrl: { x: 0.82 * W, y: 0.58 * H },
        loop: [
          { x: 0.12 * W, y: 0.22 * H }, { x: 0.46 * W, y: 0.40 * H },
          { x: 0.82 * W, y: 0.24 * H }, { x: 0.95 * W, y: 0.52 * H },
          { x: 0.58 * W, y: 0.62 * H }, { x: 0.22 * W, y: 0.44 * H },
        ],
        base: 0.68, near: 0.94, far: 0.54, mid: 0.82,
        loopDur: 15, wingBeat: 0.66, bankAmp: 13, pitch: 18,
        entranceDelay: 0.8, entranceDur: 2.6,
      },
      { // 4 — small-mid, fast crossing along the very top
        wrap: w4.current!, mascot: b4.current!,
        start: { x: -0.22 * W, y: 0.10 * H }, ctrl: { x: 0.22 * W, y: 0.06 * H },
        loop: [
          { x: 0.06 * W, y: 0.10 * H }, { x: 0.36 * W, y: 0.04 * H },
          { x: 0.66 * W, y: 0.12 * H }, { x: 0.95 * W, y: 0.05 * H },
          { x: 0.56 * W, y: 0.13 * H }, { x: 0.26 * W, y: 0.06 * H },
        ],
        base: 0.50, near: 0.70, far: 0.42, mid: 0.58,
        loopDur: 11, wingBeat: 0.5, bankAmp: 11, pitch: 13,
        entranceDelay: 2.2, entranceDur: 2.2,
      },
      { // 5 — small, quick darting through the mid-right
        wrap: w5.current!, mascot: b5.current!,
        start: { x: 1.22 * W, y: 0.45 * H }, ctrl: { x: 0.84 * W, y: 0.50 * H },
        loop: [
          { x: 0.58 * W, y: 0.52 * H }, { x: 0.82 * W, y: 0.64 * H },
          { x: 0.95 * W, y: 0.48 * H }, { x: 0.80 * W, y: 0.38 * H },
          { x: 0.62 * W, y: 0.50 * H }, { x: 0.74 * W, y: 0.62 * H },
        ],
        base: 0.46, near: 0.63, far: 0.39, mid: 0.54,
        loopDur: 9, wingBeat: 0.46, bankAmp: 15, pitch: 15,
        entranceDelay: 2.9, entranceDur: 2.0,
      },
    ];

    ctxRef.current = gsap.context(() => {
      CONFIGS.forEach((cfg) => {
        const { wrap, mascot, start, ctrl, loop, base, near, far, mid,
                loopDur, wingBeat, bankAmp, pitch, entranceDelay, entranceDur } = cfg;
        const pageLeft  = mascot.pageLeft;
        const pageRight = mascot.pageRight;
        const arrival   = loop[0] as Pt;
        const loopPath  = [...loop, arrival]; // closed for seamless repeat

        // Wings hinge at the spine (the inner edge of each page)
        gsap.set(pageLeft,  { transformOrigin: 'right center' });
        gsap.set(pageRight, { transformOrigin: 'left center'  });

        // ── Reduced motion: static bird's-eye book, steady glow, no fx ──────
        if (reduced) {
          gsap.set(wrap, {
            transformPerspective: 760,
            xPercent: -50, yPercent: -50,
            x: arrival.x, y: arrival.y,
            scale: base, opacity: 1,
            rotationX: pitch, rotation: bankAmp * 0.4,
            '--glow-depth': 1, '--glow-flicker': 1,
          });
          gsap.set(pageLeft,  { rotationY: -30 });
          gsap.set(pageRight, { rotationY:  30 });
          return;
        }

        // ── Initial: off-screen, tilted to the bird's-eye pitch, full opacity ──
        gsap.set(wrap, {
          transformPerspective: 760,
          xPercent: -50, yPercent: -50,
          x: start.x, y: start.y,
          scale: far, opacity: 1,
          rotationX: pitch, rotation: bankAmp,
          '--glow-depth': 0.7, '--glow-flicker': 1,
        });
        gsap.set(pageLeft,  { rotationY: -30 });
        gsap.set(pageRight, { rotationY:  30 });

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

        // ── Bank (roll) along the path + a gentle pitch bob around the tilt ──
        gsap.to(wrap, {
          rotation: -bankAmp,
          duration: loopDur * rnd(0.16, 0.26), ease: 'sine.inOut',
          yoyo: true, repeat: -1, delay: loopStart - rnd(0, 1.5),
        });
        gsap.to(wrap, {
          rotationX: pitch + rnd(5, 9),
          duration: rnd(1.8, 2.8), ease: 'sine.inOut',
          yoyo: true, repeat: -1,
          startAt: { rotationX: pitch - rnd(4, 8) }, delay: entranceDelay,
        });

        // ── Wing-beat: both page-halves flap up/down together like a bird ──
        // Fast down-stroke (drives flight), slower up-stroke recovery, looping.
        const dn = -12, up = -54; // left-wing rotationY endpoints (right mirrors)
        const wt = gsap.timeline({ repeat: -1, delay: entranceDelay + 0.15 });
        wt.to(pageLeft,  { rotationY: dn,  duration: wingBeat * 0.40, ease: 'power2.in'  }, 0)
          .to(pageRight, { rotationY: -dn, duration: wingBeat * 0.40, ease: 'power2.in'  }, 0)
          .to(pageLeft,  { rotationY: up,  duration: wingBeat * 0.60, ease: 'power1.out' }, wingBeat * 0.40)
          .to(pageRight, { rotationY: -up, duration: wingBeat * 0.60, ease: 'power1.out' }, wingBeat * 0.40);

        // ── Paper ripple: a faint independent flutter layered on the wing-flap ──
        gsap.to([pageLeft, pageRight], {
          rotationX: '+=7',
          duration: rnd(0.32, 0.5), ease: 'sine.inOut',
          yoyo: true, repeat: -1,
          startAt: { rotationX: -3.5 }, delay: entranceDelay + 0.15,
        });

        // ── Living firefly glow flicker ─────────────────────────────────────
        fireflyFlicker(wrap, cleanupFns.current);

        // ── Fairy-dust sparkle trail ────────────────────────────────────────
        scheduleSparkles(wrap, layer, visibleRef, loopStart + rnd(0.3, 1.2), cleanupFns.current);
      });
    });

    return () => {
      ctxRef.current?.revert();
      cleanupFns.current.forEach(fn => fn());
      cleanupFns.current = [];
    };
  }, []);

  // ── Fade whole layer in / out; gate sparkle emission via visibleRef ───────
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
      <div ref={w1} className={styles.bookWrap}><BookMascot ref={b1} mode="static" showBase={false} className={styles.flyingOrient} /></div>
      <div ref={w2} className={styles.bookWrap}><BookMascot ref={b2} mode="static" showBase={false} className={styles.flyingOrient} /></div>
      <div ref={w3} className={styles.bookWrap}><BookMascot ref={b3} mode="static" showBase={false} className={styles.flyingOrient} /></div>
      <div ref={w4} className={styles.bookWrap}><BookMascot ref={b4} mode="static" showBase={false} className={styles.flyingOrient} /></div>
      <div ref={w5} className={styles.bookWrap}><BookMascot ref={b5} mode="static" showBase={false} className={styles.flyingOrient} /></div>
      <div ref={sparkleLayerRef} className={styles.sparkleLayer} />
    </div>
  );
}
