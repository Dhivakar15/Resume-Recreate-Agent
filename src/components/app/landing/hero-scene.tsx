'use client';

/**
 * Decorative 3D layer for the landing hero — the light-theme sibling of the
 * auth scene: emerald glass cubes, a floating resume sheet and gold dust,
 * drifting on gentle loops with pointer parallax. Purely presentational
 * (aria-hidden, pointer-events-none) and rendered behind the hero content.
 * All animation is skipped when the user prefers reduced motion.
 */

import { useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';
import { Award, FileText, PenLine, Sparkles, Target } from 'lucide-react';

/** Deterministic gold-dust positions (no Math.random → hydration-safe). */
const DUST: Array<{ left: number; top: number; size: number; duration: number; delay: number }> = [
  { left: 8, top: 30, size: 3, duration: 7, delay: 0 },
  { left: 16, top: 68, size: 2, duration: 9, delay: 1.1 },
  { left: 27, top: 14, size: 2, duration: 8, delay: 0.5 },
  { left: 36, top: 82, size: 3, duration: 10, delay: 1.8 },
  { left: 49, top: 10, size: 2, duration: 8.5, delay: 0.2 },
  { left: 58, top: 74, size: 3, duration: 9.5, delay: 1.4 },
  { left: 69, top: 22, size: 2, duration: 7.5, delay: 2.2 },
  { left: 78, top: 60, size: 3, duration: 10.5, delay: 0.8 },
  { left: 88, top: 34, size: 2, duration: 8.2, delay: 1.6 },
  { left: 94, top: 72, size: 3, duration: 9, delay: 0.4 },
];

const CUBE_ICONS = [FileText, Sparkles, Target, Award, PenLine];

interface CubeProps {
  size: number;
  duration: number;
  spin: boolean;
  className?: string;
  parallaxX?: MotionValue<number>;
  parallaxY?: MotionValue<number>;
}

/** A slowly rotating light-theme glass cube with emerald frames. */
function GlassCube({ size, duration, spin, className, parallaxX, parallaxY }: CubeProps) {
  const half = size / 2;
  const faces = [
    `translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(-90deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`,
  ];

  return (
    <motion.div
      className={'pointer-events-none absolute ' + (className ?? '')}
      style={parallaxX && parallaxY ? { x: parallaxX, y: parallaxY } : undefined}
      aria-hidden
    >
      <div className="[perspective:900px]">
        <motion.div
          className="[transform-style:preserve-3d]"
          style={{ width: size, height: size }}
          animate={spin ? { rotateX: 360, rotateY: 360 } : undefined}
          transition={{ repeat: Infinity, duration, ease: 'linear' }}
        >
          {faces.map((transform, index) => {
            const Icon = CUBE_ICONS[index % CUBE_ICONS.length];
            return (
              <div
                key={index}
                className="absolute inset-0 flex items-center justify-center border border-emerald-600/25 bg-white/50 shadow-[inset_0_0_18px_rgba(13,148,136,0.08)] backdrop-blur-[2px] dark:border-emerald-500/20 dark:bg-emerald-900/30"
                style={{ transform, width: size, height: size }}
              >
                <Icon className="h-[38%] w-[38%] text-emerald-700/60 dark:text-emerald-300/60" strokeWidth={1.5} />
              </div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}

interface SheetProps {
  className?: string;
  depth: number;
  delay?: number;
  parallaxX?: MotionValue<number>;
  parallaxY?: MotionValue<number>;
}

/** A floating 3D "resume sheet" with skeleton content lines (light glass). */
function FloatingSheet({ className, depth, delay = 0, parallaxX, parallaxY }: SheetProps) {
  return (
    <motion.div
      className={'pointer-events-none absolute ' + (className ?? '')}
      style={parallaxX && parallaxY ? { x: parallaxX, y: parallaxY } : undefined}
      aria-hidden
    >
      <motion.div
        className="w-36 rounded-lg border border-emerald-600/20 bg-white/70 p-4 shadow-[0_24px_50px_-24px_rgba(6,78,59,0.35)] backdrop-blur-[3px] dark:border-emerald-500/20 dark:bg-emerald-950/50"
        style={{ transform: `rotateX(10deg) rotateY(-14deg) translateZ(${depth}px)` }}
        animate={{ y: [0, -12, 0] }}
        transition={{ repeat: Infinity, duration: 7, delay, ease: 'easeInOut' }}
      >
        <div className="mb-3 h-2.5 w-14 rounded-full bg-emerald-700/50 dark:bg-emerald-400/50" />
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-emerald-900/15 dark:bg-emerald-100/15" />
          <div className="h-1.5 w-5/6 rounded-full bg-emerald-900/15 dark:bg-emerald-100/15" />
          <div className="h-1.5 w-4/6 rounded-full bg-emerald-900/15 dark:bg-emerald-100/15" />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-3">
          <div className="h-3 w-9 rounded-full border border-emerald-600/30 dark:border-emerald-400/30" />
          <div className="h-3 w-11 rounded-full border border-emerald-600/30 dark:border-emerald-400/30" />
          <div className="h-3 w-8 rounded-full border border-emerald-600/30 dark:border-emerald-400/30" />
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Hero-section 3D decoration layer. Render inside the hero <section>. */
export function HeroScene() {
  const reduced = useReducedMotion();

  // Pointer parallax (window-level, gentle for the light marketing page).
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 45, damping: 18 });
  const springY = useSpring(rawY, { stiffness: 45, damping: 18 });

  useEffect(() => {
    if (reduced) return;
    function onMove(event: MouseEvent) {
      rawX.set(event.clientX / window.innerWidth - 0.5);
      rawY.set(event.clientY / window.innerHeight - 0.5);
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [rawX, rawY, reduced]);

  // Depth layers — nearer layers travel farther.
  const cubeX = useTransform(springX, [-0.5, 0.5], [12, -12]);
  const cubeY = useTransform(springY, [-0.5, 0.5], [9, -9]);
  const sheetX = useTransform(springX, [-0.5, 0.5], [20, -20]);
  const sheetY = useTransform(springY, [-0.5, 0.5], [14, -14]);
  const dustX = useTransform(springX, [-0.5, 0.5], [6, -6]);
  const dustY = useTransform(springY, [-0.5, 0.5], [5, -5]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Glass cubes */}
      <GlassCube
        size={88}
        duration={26}
        spin={!reduced}
        className="right-[2%] top-[6%] hidden md:block"
        parallaxX={reduced ? undefined : cubeX}
        parallaxY={reduced ? undefined : cubeY}
      />
      <GlassCube
        size={56}
        duration={19}
        spin={!reduced}
        className="bottom-[10%] left-[4%] hidden sm:block"
        parallaxX={reduced ? undefined : cubeX}
        parallaxY={reduced ? undefined : cubeY}
      />
      <GlassCube
        size={40}
        duration={14}
        spin={!reduced}
        className="bottom-[4%] right-[30%] hidden lg:block"
        parallaxX={reduced ? undefined : cubeX}
        parallaxY={reduced ? undefined : cubeY}
      />

      {/* Floating resume sheets */}
      <FloatingSheet
        className="left-[38%] top-[6%] hidden lg:block"
        depth={24}
        parallaxX={reduced ? undefined : sheetX}
        parallaxY={reduced ? undefined : sheetY}
      />
      <FloatingSheet
        className="bottom-[8%] right-[6%] hidden xl:block"
        depth={14}
        delay={1.4}
        parallaxX={reduced ? undefined : sheetX}
        parallaxY={reduced ? undefined : sheetY}
      />

      {/* Gold dust — the antique-gold thread tying the landing to the studio */}
      <motion.div className="absolute inset-0" style={reduced ? undefined : { x: dustX, y: dustY }}>
        {DUST.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-[#d4a548]"
            style={{
              left: p.left + '%',
              top: p.top + '%',
              width: p.size,
              height: p.size,
              boxShadow: '0 0 8px 1px rgba(212,165,72,0.45)',
            }}
            animate={reduced ? undefined : { y: [0, -16, 0], opacity: [0.3, 0.75, 0.3] }}
            transition={{ repeat: Infinity, duration: p.duration, delay: p.delay, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>
    </div>
  );
}
