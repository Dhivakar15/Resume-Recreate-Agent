'use client';

/**
 * Decorative 3D backdrop for the auth pages — "Burgundy & Antique Gold" scene.
 * Purely presentational (aria-hidden, pointer-events-none): a rotating
 * gold-framed glass cube, floating resume sheets, gold dust and a parallax
 * layer system driven by the pointer. When `mode` is "login" a golden 3D
 * wax-seal medallion (the sign-in emblem) drifts in the scene as well.
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
  BriefcaseBusiness,
  FileText,
  KeyRound,
  PenLine,
  Sparkles,
  Target,
} from 'lucide-react';

/** Deterministic particle field (no Math.random → hydration-safe). */
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

const CUBE_ICONS = [FileText, Sparkles, Target, Award, PenLine, BriefcaseBusiness];

interface CubeProps {
  size: number;
  duration: number;
  spin: boolean;
  className?: string;
  parallaxX?: MotionValue<number>;
  parallaxY?: MotionValue<number>;
}

/** A rotating 3D glass cube with gold-framed faces and an icon on each side. */
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
          {faces.map((transform, index) => {
            const Icon = CUBE_ICONS[index % CUBE_ICONS.length];
            return (
              <div
                key={index}
                className="absolute inset-0 flex items-center justify-center border border-[#d4a548]/30 bg-[#5c1220]/25 shadow-[inset_0_0_24px_rgba(212,165,72,0.08)] backdrop-blur-[2px]"
                style={{ transform, width: size, height: size }}
              >
                <Icon className="h-[38%] w-[38%] text-[#d4a548]/60" strokeWidth={1.5} />
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

/** A floating 3D "resume sheet" with skeleton content lines. */
function FloatingSheet({ className, depth, delay = 0, parallaxX, parallaxY }: SheetProps) {
  return (
    <motion.div
      className={'pointer-events-none absolute ' + (className ?? '')}
      style={parallaxX && parallaxY ? { x: parallaxX, y: parallaxY } : undefined}
      aria-hidden
    >
      <motion.div
        className="w-40 rounded-lg border border-[#d4a548]/30 bg-[#f4e9d4]/[0.06] p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-[3px]"
        style={{ transform: `rotateX(10deg) rotateY(-16deg) translateZ(${depth}px)` }}
        animate={{ y: [0, -12, 0] }}
        transition={{ repeat: Infinity, duration: 6.5, delay, ease: 'easeInOut' }}
      >
        <div className="mb-3 h-2.5 w-16 rounded-full bg-[#d4a548]/50" />
        <div className="space-y-1.5">
          <div className="h-1 w-full rounded-full bg-[#d4a548]/25" />
          <div className="h-1 w-5/6 rounded-full bg-[#d4a548]/25" />
          <div className="h-1 w-4/6 rounded-full bg-[#d4a548]/25" />
        </div>
        <div className="mb-2 mt-4 h-1.5 w-12 rounded-full bg-[#d4a548]/40" />
        <div className="flex flex-wrap gap-1.5">
          <div className="h-3 w-9 rounded-full border border-[#d4a548]/35" />
          <div className="h-3 w-11 rounded-full border border-[#d4a548]/35" />
          <div className="h-3 w-8 rounded-full border border-[#d4a548]/35" />
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * A gently swaying 3D medallion — the golden "wax seal" of the sign-in page.
 * Sways on the Y axis inside a perspective wrapper so the elliptical rim and
 * the embossed key read as true 3D rotation.
 */
function FloatingSeal({
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
          <span className="absolute -inset-6 rounded-full bg-[#d4a548]/10 blur-2xl" />
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#d4a548]/45 bg-gradient-to-br from-[#5c1220]/70 to-[#2b0a12]/70 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.85),inset_0_0_30px_rgba(212,165,72,0.12)] backdrop-blur-[3px]">
            <span className="absolute inset-2 rounded-full border border-[#d4a548]/30" />
            <KeyRound className="h-9 w-9 text-[#e9c876]" strokeWidth={1.5} />
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/** Full-viewport classical scene. Render behind the auth forms. */
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
  const dustX = useTransform(springX, [-0.5, 0.5], [8, -8]);
  const dustY = useTransform(springY, [-0.5, 0.5], [6, -6]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Deep burgundy base + corner glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#5c1220_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,#430e19_0%,transparent_50%),linear-gradient(160deg,#2b0a12_0%,#1a0509_55%,#240810_100%)]" />

      {/* Classical diamond lattice */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(212,165,72,0.045) 0 1px, transparent 1px 52px), repeating-linear-gradient(-45deg, rgba(212,165,72,0.045) 0 1px, transparent 1px 52px)',
        }}
      />

      {/* Ornamental rings */}
      <div className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full border border-[#d4a548]/15" />
      <div className="absolute -left-32 -top-32 h-[22rem] w-[22rem] rounded-full border border-[#d4a548]/10" />
      <div className="absolute -bottom-48 -right-40 h-[34rem] w-[34rem] rounded-full border border-[#d4a548]/[0.12]" />

      {/* Oversized serif monogram */}
      <div className="absolute -bottom-24 -left-6 select-none font-serif text-[24rem] italic leading-none text-[#d4a548]/[0.05]">
        R
      </div>

      {/* Gold dust */}
      <motion.div className="absolute inset-0" style={reduced ? undefined : { x: dustX, y: dustY }}>
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-[#e9c876]"
            style={{
              left: p.left + '%',
              top: p.top + '%',
              width: p.size,
              height: p.size,
              boxShadow: '0 0 8px 1px rgba(233,200,118,0.5)',
            }}
            animate={reduced ? undefined : { y: [0, -18, 0], opacity: [0.35, 0.9, 0.35] }}
            transition={{ repeat: Infinity, duration: p.duration, delay: p.delay, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>

      {/* 3D cubes */}
      <RotatingCube
        size={104}
        duration={22}
        spin={!reduced}
        className="left-[4%] top-[7%] hidden md:block"
        parallaxX={reduced ? undefined : cubeX}
        parallaxY={reduced ? undefined : cubeY}
      />
      <RotatingCube
        size={72}
        duration={16}
        spin={!reduced}
        className="bottom-[12%] right-[8%] hidden sm:block"
        parallaxX={reduced ? undefined : cubeX}
        parallaxY={reduced ? undefined : cubeY}
      />
      <RotatingCube
        size={48}
        duration={13}
        spin={!reduced}
        className="right-[22%] top-[10%] hidden lg:block"
        parallaxX={reduced ? undefined : cubeX}
        parallaxY={reduced ? undefined : cubeY}
      />

      {/* Floating resume sheets */}
      <FloatingSheet
        className="right-[6%] top-[20%] hidden lg:block"
        depth={30}
        parallaxX={reduced ? undefined : sheetX}
        parallaxY={reduced ? undefined : sheetY}
      />

      {/* Sign-in wax seal — the emblem of the dedicated sign-in page */}
      {mode === 'login' && (
        <FloatingSeal
          className="bottom-[9%] left-[42%] hidden xl:block"
          animate={!reduced}
          delay={0.8}
          parallaxX={reduced ? undefined : sheetX}
          parallaxY={reduced ? undefined : sheetY}
        />
      )}
      <FloatingSheet
        className="left-[44%] top-[6%] hidden xl:block"
        depth={18}
        delay={1.6}
        parallaxX={reduced ? undefined : sheetX}
        parallaxY={reduced ? undefined : sheetY}
      />

      {/* Depth vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(12,3,6,0.55)_100%)]" />
    </div>
  );
}
