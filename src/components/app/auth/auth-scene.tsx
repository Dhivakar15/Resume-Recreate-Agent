'use client';

/**
 * Decorative 3D backdrop for the auth pages — "Neural Nexus" AI scene.
 * Purely presentational (aria-hidden, pointer-events-none) and matched to
 * the landing page's Midnight-Glass style: a deep navy/black space lit by
 * violet, electric-blue and cyan glows, a neural-network constellation of
 * glowing nodes and connecting lines, drifting particles, rotating glass
 * cubes, floating resume sheets, satellite rings — and, on the sign-in
 * page, a floating "AI core" emblem that slowly sways in 3D.
 * Pointer movement drives gentle parallax across the depth layers.
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
import {
  Award,
  BrainCircuit,
  BriefcaseBusiness,
  FileText,
  PenLine,
  ScanLine,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react';

/* ── Deterministic data (no Math.random → hydration-safe) ───────────────── */

const PARTICLE_COLORS = ['#67e8f9', '#a78bfa', '#60a5fa', '#e2e8f0'];

const PARTICLES: Array<{ left: number; top: number; size: number; duration: number; delay: number }> = [
  { left: 6, top: 18, size: 3, duration: 7, delay: 0 },
  { left: 13, top: 64, size: 2, duration: 9, delay: 1.2 },
  { left: 21, top: 32, size: 4, duration: 8, delay: 0.6 },
  { left: 30, top: 78, size: 2, duration: 10, delay: 2.1 },
  { left: 38, top: 12, size: 3, duration: 7.5, delay: 1.7 },
  { left: 47, top: 56, size: 2, duration: 9.5, delay: 0.3 },
  { left: 55, top: 24, size: 3, duration: 8.2, delay: 2.6 },
  { left: 63, top: 70, size: 4, duration: 10.5, delay: 0.9 },
  { left: 71, top: 40, size: 2, duration: 7.8, delay: 1.4 },
  { left: 79, top: 15, size: 3, duration: 8.8, delay: 2.3 },
  { left: 86, top: 60, size: 2, duration: 9.2, delay: 0.5 },
  { left: 92, top: 34, size: 3, duration: 7.2, delay: 1.9 },
  { left: 17, top: 46, size: 2, duration: 8.4, delay: 2.8 },
  { left: 68, top: 88, size: 3, duration: 9.8, delay: 0.8 },
];

/** Neural-network constellation — node positions in % of the viewport. */
const NODES: Array<{ x: number; y: number }> = [
  { x: 4, y: 12 }, { x: 12, y: 30 }, { x: 7, y: 55 }, { x: 15, y: 78 },
  { x: 24, y: 10 }, { x: 28, y: 44 }, { x: 20, y: 62 }, { x: 33, y: 88 },
  { x: 40, y: 22 }, { x: 46, y: 70 }, { x: 55, y: 8 }, { x: 58, y: 38 },
  { x: 66, y: 84 }, { x: 72, y: 16 }, { x: 78, y: 52 }, { x: 84, y: 30 },
  { x: 90, y: 70 }, { x: 95, y: 12 }, { x: 88, y: 90 }, { x: 36, y: 50 },
];

/** Edges of the constellation — index pairs into NODES. */
const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [1, 5], [5, 6], [6, 7],
  [5, 19], [19, 9], [4, 8], [8, 11], [11, 13], [13, 17], [11, 14],
  [14, 15], [15, 17], [14, 18], [9, 12], [12, 16], [16, 18], [10, 11],
  [10, 13], [3, 7], [2, 6],
];

const CUBE_ICONS = [FileText, Sparkles, Target, Award, PenLine, BriefcaseBusiness];

/* ── Floating glass shapes ──────────────────────────────────────────────── */

interface CubeProps {
  size: number;
  duration: number;
  spin: boolean;
  className?: string;
  parallaxX?: MotionValue<number>;
  parallaxY?: MotionValue<number>;
}

/** A rotating 3D glass cube with violet/cyan framed faces and an icon on each side. */
function RotatingCube({ size, duration, spin, className, parallaxX, parallaxY }: CubeProps) {
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
          {faces.map((transform, index) => (
            <div
              key={index}
              className="absolute inset-0 flex items-center justify-center border border-white/10 bg-white/[0.04] shadow-[inset_0_0_24px_rgba(129,140,248,0.1)] backdrop-blur-[2px]"
              style={{ transform, width: size, height: size }}
            >
              <Icon
                icon={CUBE_ICONS[index % CUBE_ICONS.length]}
                tone={index % 2 === 0 ? 'text-violet-300/60' : 'text-cyan-300/60'}
              />
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

function Icon({ icon: IconComponent, tone }: { icon: LucideIcon; tone: string }) {
  return <IconComponent className={`h-[38%] w-[38%] ${tone}`} strokeWidth={1.5} aria-hidden />;
}

interface SheetProps {
  className?: string;
  depth: number;
  delay?: number;
  parallaxX?: MotionValue<number>;
  parallaxY?: MotionValue<number>;
}

/** A floating 3D "resume sheet" with skeleton content lines (dark glass). */
function FloatingSheet({ className, depth, delay = 0, parallaxX, parallaxY }: SheetProps) {
  return (
    <motion.div
      className={'pointer-events-none absolute ' + (className ?? '')}
      style={parallaxX && parallaxY ? { x: parallaxX, y: parallaxY } : undefined}
      aria-hidden
    >
      <motion.div
        className="w-40 rounded-lg border border-white/10 bg-white/[0.05] p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] backdrop-blur-[3px]"
        style={{ transform: `rotateX(10deg) rotateY(-16deg) translateZ(${depth}px)` }}
        animate={{ y: [0, -12, 0] }}
        transition={{ repeat: Infinity, duration: 6.5, delay, ease: 'easeInOut' }}
      >
        <div className="mb-3 h-2.5 w-16 rounded-full bg-violet-400/50" />
        <div className="space-y-1.5">
          <div className="h-1 w-full rounded-full bg-white/15" />
          <div className="h-1 w-5/6 rounded-full bg-white/15" />
          <div className="h-1 w-4/6 rounded-full bg-white/15" />
        </div>
        <div className="mb-2 mt-4 h-1.5 w-12 rounded-full bg-cyan-300/40" />
        <div className="flex flex-wrap gap-1.5">
          <div className="h-3 w-9 rounded-full border border-violet-300/30" />
          <div className="h-3 w-11 rounded-full border border-cyan-300/25" />
          <div className="h-3 w-8 rounded-full border border-white/15" />
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * The "AI core" emblem of the sign-in page — a glass orb with a pulsing
 * neural core, encircled by an orbiting data satellite. Sways in true 3D.
 */
function AICore({
  className,
  animate,
  delay = 0,
  parallaxX,
  parallaxY,
}: {
  className?: string;
  animate: boolean;
  delay?: number;
  parallaxX?: MotionValue<number>;
  parallaxY?: MotionValue<number>;
}) {
  return (
    <motion.div
      className={'pointer-events-none absolute ' + (className ?? '')}
      style={parallaxX && parallaxY ? { x: parallaxX, y: parallaxY } : undefined}
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
    >
      <motion.div
        className="[perspective:640px]"
        animate={animate ? { y: [0, -10, 0] } : undefined}
        transition={{ repeat: Infinity, duration: 7, delay, ease: 'easeInOut' }}
      >
        <motion.div
          className="relative flex h-24 w-24 items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
          animate={animate ? { rotateY: [-24, 24, -24] } : undefined}
          transition={{ repeat: Infinity, duration: 10, delay, ease: 'easeInOut' }}
        >
          <span className="absolute -inset-6 rounded-full bg-[rgba(56,189,248,0.12)] blur-2xl" />
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full border border-cyan-300/30 bg-gradient-to-br from-violet-600/30 to-blue-600/20 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.85),inset_0_0_30px_rgba(56,189,248,0.12)] backdrop-blur-[3px]">
            <span className="absolute inset-2 rounded-full border border-violet-300/25" />
            <BrainCircuit className="h-9 w-9 text-cyan-200" strokeWidth={1.5} />
          </span>
          {/* Orbiting data satellite */}
          <motion.span
            className="absolute inset-[-7px]"
            animate={animate ? { rotate: 360 } : undefined}
            transition={{ repeat: Infinity, duration: 9, ease: 'linear' }}
          >
            <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_10px_2px_rgba(34,211,238,0.7)]" />
          </motion.span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/** A large glass satellite ring with a dashed inner orbit and one bright dot. */
function GlassRing({
  className,
  size,
  duration,
  parallaxX,
  parallaxY,
}: {
  className?: string;
  size: number;
  duration: number;
  parallaxX?: MotionValue<number>;
  parallaxY?: MotionValue<number>;
}) {
  return (
    <motion.div
      className={'pointer-events-none absolute ' + (className ?? '')}
      style={parallaxX && parallaxY ? { x: parallaxX, y: parallaxY } : undefined}
      aria-hidden
    >
      <motion.div
        className="relative rounded-full border border-white/[0.07] bg-white/[0.02] shadow-[inset_0_0_40px_rgba(129,140,248,0.07)] backdrop-blur-[2px]"
        style={{ width: size, height: size }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration, ease: 'linear' }}
      >
        <span className="absolute inset-3 rounded-full border border-dashed border-violet-300/15" />
        <span className="absolute inset-7 rounded-full border border-cyan-300/10" />
        <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/80 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
      </motion.div>
    </motion.div>
  );
}

/* ── The scene ──────────────────────────────────────────────────────────── */

/** Full-viewport futuristic AI scene. Render behind the auth forms. */
export function AuthScene({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const reduced = useReducedMotion();

  // Pointer parallax (window-level so it also works while hovering the card).
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
  const cubeX = useTransform(springX, [-0.5, 0.5], [16, -16]);
  const cubeY = useTransform(springY, [-0.5, 0.5], [12, -12]);
  const sheetX = useTransform(springX, [-0.5, 0.5], [26, -26]);
  const sheetY = useTransform(springY, [-0.5, 0.5], [18, -18]);
  const netX = useTransform(springX, [-0.5, 0.5], [10, -10]);
  const netY = useTransform(springY, [-0.5, 0.5], [8, -8]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Deep navy/black base + electric glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(30,41,99,0.6)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(23,37,84,0.55)_0%,transparent_50%),linear-gradient(160deg,#070b18_0%,#04050d_55%,#060a19_100%)]" />

      {/* Violet / cyan / blue aurora orbs */}
      <div className="absolute -top-32 right-[8%] h-80 w-80 rounded-full bg-violet-600/20 blur-[110px]" />
      <div className="absolute bottom-[-6rem] left-[-4rem] h-72 w-72 rounded-full bg-cyan-500/[0.13] blur-[100px]" />
      <div className="absolute left-[38%] top-[38%] h-64 w-64 rounded-full bg-blue-600/10 blur-[110px]" />

      {/* Futuristic dot grid */}
      <div
        className="absolute inset-0 opacity-80 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_45%,black_30%,transparent_80%)]"
        style={{
          backgroundImage: 'radial-gradient(rgba(148,163,184,0.09) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />

      {/* Neural-network constellation: lines (SVG) + pulsing nodes (HTML) */}
      <motion.div className="absolute inset-0" style={reduced ? undefined : { x: netX, y: netY }}>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {EDGES.map(([a, b], i) => (
            <line
              key={i}
              x1={NODES[a].x}
              y1={NODES[a].y}
              x2={NODES[b].x}
              y2={NODES[b].y}
              stroke={i % 3 === 0 ? 'rgba(34,211,238,0.13)' : 'rgba(129,140,248,0.11)'}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {NODES.map((node, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: node.x + '%',
              top: node.y + '%',
              width: i % 4 === 0 ? 6 : 4,
              height: i % 4 === 0 ? 6 : 4,
              backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
              boxShadow: `0 0 10px 1px ${PARTICLE_COLORS[i % PARTICLE_COLORS.length]}55`,
              opacity: 0.5,
            }}
            animate={reduced ? undefined : { opacity: [0.25, 0.85, 0.25], scale: [1, 1.35, 1] }}
            transition={{ repeat: Infinity, duration: 4 + (i % 5), delay: i * 0.3, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>

      {/* Drifting particles */}
      <motion.div className="absolute inset-0" style={reduced ? undefined : { x: netX, y: netY }}>
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: p.left + '%',
              top: p.top + '%',
              width: p.size,
              height: p.size,
              backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
              boxShadow: `0 0 8px 1px ${PARTICLE_COLORS[i % PARTICLE_COLORS.length]}55`,
            }}
            animate={reduced ? undefined : { y: [0, -18, 0], opacity: [0.35, 0.9, 0.35] }}
            transition={{ repeat: Infinity, duration: p.duration, delay: p.delay, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>

      {/* Glass satellite rings */}
      <GlassRing
        size={260}
        duration={46}
        className="-left-24 -top-24 hidden md:block"
        parallaxX={reduced ? undefined : cubeX}
        parallaxY={reduced ? undefined : cubeY}
      />
      <GlassRing
        size={180}
        duration={34}
        className="bottom-[6%] right-[4%] hidden lg:block"
        parallaxX={reduced ? undefined : cubeX}
        parallaxY={reduced ? undefined : cubeY}
      />

      {/* 3D glass cubes */}
      <RotatingCube
        size={104}
        duration={22}
        spin={!reduced}
        className="left-[4%] top-[30%] hidden xl:block"
        parallaxX={reduced ? undefined : cubeX}
        parallaxY={reduced ? undefined : cubeY}
      />
      <RotatingCube
        size={72}
        duration={16}
        spin={!reduced}
        className="right-[6%] top-[12%] hidden sm:block"
        parallaxX={reduced ? undefined : cubeX}
        parallaxY={reduced ? undefined : cubeY}
      />
      <RotatingCube
        size={48}
        duration={13}
        spin={!reduced}
        className="bottom-[14%] left-[8%] hidden lg:block"
        parallaxX={reduced ? undefined : cubeX}
        parallaxY={reduced ? undefined : cubeY}
      />

      {/* Floating resume sheets */}
      <FloatingSheet
        className="right-[7%] top-[42%] hidden lg:block"
        depth={30}
        parallaxX={reduced ? undefined : sheetX}
        parallaxY={reduced ? undefined : sheetY}
      />
      <FloatingSheet
        className="left-[44%] top-[5%] hidden xl:block"
        depth={18}
        delay={1.6}
        parallaxX={reduced ? undefined : sheetX}
        parallaxY={reduced ? undefined : sheetY}
      />

      {/* AI core emblem — the signature of the dedicated sign-in page */}
      {mode === 'login' && (
        <AICore
          className="bottom-[10%] left-[38%] hidden 2xl:block"
          animate={!reduced}
          delay={0.8}
          parallaxX={reduced ? undefined : sheetX}
          parallaxY={reduced ? undefined : sheetY}
        />
      )}

      {/* Scanning HUD chip */}
      <motion.div
        className="absolute right-[16%] top-[64%] hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium text-slate-300 backdrop-blur-xl lg:flex"
        animate={reduced ? undefined : { y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }}
        aria-hidden
      >
        <ScanLine className="h-3 w-3 text-cyan-300" />
        Neural scan active
      </motion.div>

      {/* Depth vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(2,3,10,0.65)_100%)]" />
    </div>
  );
}
