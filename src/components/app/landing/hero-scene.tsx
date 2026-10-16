'use client';

/**
 * Hero centerpiece — "The Rebuild Chamber".
 *
 * A realistic digital resume suspended inside a tilted 3D glass container
 * while AI appears to analyse and rebuild it in real time:
 *   • a scanning beam sweeps the document,
 *   • floating glass data cards report ATS score, keyword matches and live
 *     AI rewriting progress, tied to the document with dashed connectors,
 *   • scanning corner brackets and glowing particles frame the scene,
 *   • pointer movement drives a gentle spring parallax across depth layers.
 *
 * Purely presentational: decorative layers are aria-hidden and the whole
 * scene is keyboard-inert. All infinite animation is skipped when the user
 * prefers reduced motion (static, still beautiful).
 */

import { useEffect, type ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  FolderGit2,
  GraduationCap,
  Mail,
  MapPin,
  ScanLine,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/* ── Deterministic particle field (no Math.random → hydration-safe) ─────── */

const PARTICLES: ReadonlyArray<{
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}> = [
  { left: 2, top: 10, size: 3, duration: 8, delay: 0, color: '#a78bfa' },
  { left: 10, top: 58, size: 2, duration: 9.5, delay: 1.1, color: '#22d3ee' },
  { left: 18, top: 24, size: 2, duration: 8.5, delay: 0.5, color: '#f0abfc' },
  { left: 26, top: 84, size: 3, duration: 10, delay: 1.8, color: '#a78bfa' },
  { left: 38, top: 4, size: 2, duration: 9, delay: 0.2, color: '#e2e8f0' },
  { left: 47, top: 92, size: 2, duration: 8.2, delay: 1.4, color: '#22d3ee' },
  { left: 58, top: 16, size: 3, duration: 10.5, delay: 2.2, color: '#fbbf24' },
  { left: 67, top: 70, size: 2, duration: 9.8, delay: 0.8, color: '#a78bfa' },
  { left: 76, top: 36, size: 3, duration: 8.8, delay: 1.6, color: '#22d3ee' },
  { left: 85, top: 8, size: 2, duration: 9.4, delay: 0.4, color: '#f0abfc' },
  { left: 91, top: 62, size: 3, duration: 10.2, delay: 1.2, color: '#a78bfa' },
  { left: 97, top: 30, size: 2, duration: 8.6, delay: 2, color: '#fbbf24' },
];

const SKILLS: ReadonlyArray<string> = [
  'Product Strategy',
  'Roadmapping',
  'SQL',
  'A/B Testing',
  'Figma',
  'Analytics',
];

const CERTIFICATIONS: ReadonlyArray<string> = ['PMP', 'Scrum Master', 'Google UX'];

/* ── Small building blocks ──────────────────────────────────────────────── */

/** Animated circular ATS score gauge (violet → cyan gradient). */
function ScoreRing({
  value,
  size = 58,
  stroke = 5,
  idBase,
}: {
  value: number;
  size?: number;
  stroke?: number;
  idBase: string;
}) {
  const reduced = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  const gradientId = `${idBase}-ring-grad`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduced ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.6, ease: 'easeOut', delay: 0.35 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={size >= 56 ? 'text-sm font-bold text-white' : 'text-[11px] font-bold text-white'}>
          {value}
        </span>
      </div>
    </div>
  );
}

/** Section label inside the resume document, with optional AI-improvement tag. */
function ResumeSectionHead({
  icon: Icon,
  label,
  tag,
}: {
  icon: LucideIcon;
  label: string;
  tag?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-violet-300/80" aria-hidden />
      <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </span>
      {tag && (
        <span className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-cyan-400/10 px-1.5 py-px text-[8px] font-semibold text-cyan-300 ring-1 ring-inset ring-cyan-300/20">
          <Sparkles className="h-2 w-2" aria-hidden />
          {tag}
        </span>
      )}
    </div>
  );
}

/** AI scan beam sweeping the resume document top → bottom. */
function ScanBeam() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 z-20 h-12"
      initial={{ top: '2%', opacity: 0 }}
      animate={{ top: ['2%', '35%', '65%', '92%'], opacity: [0, 0.85, 0.85, 0] }}
      transition={{ duration: 3.8, repeat: Infinity, ease: 'linear', times: [0, 0.18, 0.86, 1] }}
      aria-hidden
    >
      <div className="h-full w-full bg-gradient-to-b from-transparent via-violet-400/10 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
    </motion.div>
  );
}

/** Four pulsing scanning brackets framing the glass container. */
function CornerBrackets() {
  const reduced = useReducedMotion();
  const base = 'absolute h-5 w-5 border-violet-300/45';
  return (
    <motion.div
      className="pointer-events-none absolute -inset-2.5 z-30"
      animate={reduced ? undefined : { opacity: [0.4, 0.9, 0.4] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      <span className={`${base} left-0 top-0 rounded-tl-md border-l-2 border-t-2`} />
      <span className={`${base} right-0 top-0 rounded-tr-md border-r-2 border-t-2`} />
      <span className={`${base} bottom-0 left-0 rounded-bl-md border-b-2 border-l-2`} />
      <span className={`${base} bottom-0 right-0 rounded-br-md border-b-2 border-r-2`} />
    </motion.div>
  );
}

/** Staggered "AI is typing" dots. */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1 w-1 rounded-full bg-fuchsia-300"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

interface FloatGlassProps {
  className?: string;
  depth?: number;
  delay?: number;
  duration?: number;
  connector?: 'right' | 'left' | 'up';
  children: ReactNode;
}

/**
 * A floating glass data card tethered to the resume document.
 * `depth` pushes it toward the viewer (translateZ) inside the 3D scene;
 * `connector` draws a dashed line linking it back to the document.
 */
function FloatingDataCard({
  className,
  depth = 0,
  delay = 0,
  duration = 6,
  connector,
  children,
}: FloatGlassProps) {
  const reduced = useReducedMotion();
  return (
    <div
      className={'absolute z-20 ' + (className ?? '')}
      style={depth && !reduced ? { transform: `translateZ(${depth}px)` } : undefined}
      aria-hidden
    >
      <motion.div
        animate={reduced ? undefined : { y: [0, -9, 0] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
        className="relative"
      >
        {connector === 'right' && (
          <span className="absolute left-full top-1/2 w-7 border-t border-dashed border-violet-300/30" />
        )}
        {connector === 'left' && (
          <span className="absolute right-full top-1/2 w-7 border-t border-dashed border-violet-300/30" />
        )}
        {connector === 'up' && (
          <span className="absolute bottom-full left-8 h-7 border-l border-dashed border-violet-300/30" />
        )}
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0a0d1c]/85 p-3 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/** Small pill-shaped floating chip (status indicators). */
function FloatingChip({
  className,
  delay = 0,
  duration = 5,
  children,
}: Omit<FloatGlassProps, 'depth' | 'connector'>) {
  const reduced = useReducedMotion();
  return (
    <div className={'absolute z-20 ' + (className ?? '')} aria-hidden>
      <motion.div
        animate={reduced ? undefined : { y: [0, -7, 0] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0a0d1c]/85 px-3 py-1.5 text-[10px] font-medium text-slate-200 shadow-[0_16px_36px_-16px_rgba(0,0,0,0.85)] backdrop-blur-xl"
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ── The scene ──────────────────────────────────────────────────────────── */

/** Hero-section 3D glass resume centerpiece. */
export function HeroScene() {
  const reduced = useReducedMotion();

  // Pointer parallax (window-level, gentle and springy).
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 40, damping: 16 });
  const springY = useSpring(rawY, { stiffness: 40, damping: 16 });

  useEffect(() => {
    if (reduced) return;
    function onMove(event: MouseEvent) {
      rawX.set(event.clientX / window.innerWidth - 0.5);
      rawY.set(event.clientY / window.innerHeight - 0.5);
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [rawX, rawY, reduced]);

  // The document rests at a slight tilt; the pointer sways it around that pose.
  const rotateY = useTransform(springX, [-0.5, 0.5], [-15, -3]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [9, 1]);
  // Particle field drifts on a deeper layer (smaller travel = farther away).
  const farX = useTransform(springX, [-0.5, 0.5], [7, -7]);
  const farY = useTransform(springY, [-0.5, 0.5], [6, -6]);

  return (
    <div
      className="relative mx-auto w-full max-w-[460px] select-none px-2 [perspective:1500px] sm:px-0"
      role="img"
      aria-label="3D preview of a resume being analysed and improved by AI"
    >
      {/* Ambient glow behind everything */}
      <div className="pointer-events-none absolute -inset-10" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[120%] w-[105%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[90px]" />
        <div className="absolute right-0 top-10 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-[70px]" />
        <div className="absolute bottom-8 left-0 h-36 w-36 rounded-full bg-cyan-500/10 blur-[70px]" />
      </div>

      <motion.div
        className="[transform-style:preserve-3d]"
        style={reduced ? { rotateY: -9, rotateX: 5 } : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
      >
        {/* Deep particle layer (behind the document) */}
        <div
          className="pointer-events-none absolute -inset-14"
          style={reduced ? undefined : { transform: 'translateZ(-90px)' }}
          aria-hidden
        >
          <motion.div className="absolute inset-0" style={reduced ? undefined : { x: farX, y: farY }}>
            {PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  left: p.left + '%',
                  top: p.top + '%',
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  boxShadow: `0 0 10px 1px ${p.color}66`,
                }}
                animate={reduced ? undefined : { y: [0, -16, 0], opacity: [0.25, 0.8, 0.25] }}
                transition={{ repeat: Infinity, duration: p.duration, delay: p.delay, ease: 'easeInOut' }}
              />
            ))}
          </motion.div>
        </div>

        {/* Everything below floats as one slow bob */}
        <motion.div
          className="relative [transform-style:preserve-3d]"
          animate={reduced ? undefined : { y: [0, -12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <CornerBrackets />

          {/* ── The glass resume document ─────────────────────────────── */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-[0_40px_90px_-30px_rgba(2,0,20,0.9)] backdrop-blur-2xl [transform-style:preserve-3d]">
            {/* glass top-edge reflection + diagonal sheen */}
            <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" aria-hidden />
            <span
              className="pointer-events-none absolute -right-16 -top-24 h-48 w-64 rotate-12 bg-gradient-to-b from-white/[0.07] to-transparent blur-2xl"
              aria-hidden
            />
            <ScanBeam />

            <div className="relative p-5 sm:p-6">
              {/* Profile */}
              <div className="flex items-start justify-between gap-3 [transform:translateZ(26px)]">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(167,139,250,0.7)]">
                      AM
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                      <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[#0a0d1c] bg-cyan-400" />
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Alex Morgan</p>
                    <p className="text-xs text-slate-400">Senior Product Manager</p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-300/25 bg-violet-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-200">
                  <Sparkles className="h-2.5 w-2.5" aria-hidden />
                  AI Optimized
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3 text-violet-300/70" aria-hidden />
                  alex.morgan@mail.com
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-violet-300/70" aria-hidden />
                  San Francisco, CA
                </span>
              </div>

              {/* ATS score */}
              <div className="mt-4 flex items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5 [transform:translateZ(38px)]">
                <ScoreRing value={98} size={58} stroke={5} idBase="doc" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    AI Estimated ATS Score
                  </p>
                  <p className="text-lg font-bold leading-tight text-white">
                    98<span className="text-xs font-medium text-slate-500"> /100</span>
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-cyan-300">
                    <TrendingUp className="h-3 w-3" aria-hidden />
                    +38% interview rate
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="mt-4 border-t border-white/[0.06] pt-3.5">
                <ResumeSectionHead icon={Zap} label="Skills" tag="+3 keywords" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SKILLS.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="mt-3.5 border-t border-white/[0.06] pt-3.5">
                <ResumeSectionHead icon={BriefcaseBusiness} label="Experience" tag="+2 bullets" />
                <div className="mt-2 space-y-2.5">
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[11px] font-semibold text-white">Senior Product Manager</p>
                      <p className="text-[9px] text-slate-500">2021 — Now</p>
                    </div>
                    <p className="text-[10px] text-violet-300/80">Nexora Labs · San Francisco</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                      Scaled the B2B platform from 40k to 2M active users across 3 markets.
                    </p>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[11px] font-semibold text-white">Product Manager</p>
                      <p className="text-[9px] text-slate-500">2018 — 2021</p>
                    </div>
                    <p className="text-[10px] text-violet-300/80">BrightApps</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                      Launched 12 data-driven features with an AI-assisted roadmap.
                    </p>
                  </div>
                </div>
              </div>

              {/* Education */}
              <div className="mt-3.5 border-t border-white/[0.06] pt-3.5">
                <ResumeSectionHead icon={GraduationCap} label="Education" />
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-semibold text-white">B.S. Computer Science</p>
                  <p className="text-[9px] text-slate-500">2014 — 2018</p>
                </div>
                <p className="text-[10px] text-violet-300/80">State University</p>
              </div>

              {/* Projects */}
              <div className="mt-3.5 border-t border-white/[0.06] pt-3.5">
                <ResumeSectionHead icon={FolderGit2} label="Projects" tag="AI polished" />
                <p className="mt-2 text-[11px] font-semibold text-white">Atlas Analytics Dashboard</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                  Led an AI-assisted redesign that lifted user retention by 27%.
                </p>
              </div>

              {/* Certifications */}
              <div className="mt-3.5 border-t border-white/[0.06] pt-3.5">
                <ResumeSectionHead icon={Award} label="Certifications" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CERTIFICATIONS.map((cert) => (
                    <span
                      key={cert}
                      className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2 py-0.5 text-[10px] text-amber-200/90"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Floating AI data cards ─────────────────────────────────── */}
          {/* Hidden below `sm` — on phones they would cover the document;
              the document itself already carries both data points. */}
          <FloatingDataCard className="top-14 hidden sm:block sm:-left-12" depth={60} duration={5.5} connector="right">
            <div className="flex items-center gap-2.5">
              <ScoreRing value={98} size={40} stroke={4} idBase="floatA" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  ATS Score
                </p>
                <p className="text-sm font-bold leading-tight text-white">
                  98<span className="text-[10px] text-slate-500">/100</span>
                </p>
              </div>
            </div>
          </FloatingDataCard>

          <FloatingDataCard className="top-[46%] hidden sm:block sm:-right-12" depth={48} delay={0.9} duration={6.5} connector="left">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 ring-1 ring-inset ring-violet-300/25">
                <Target className="h-4 w-4 text-violet-300" aria-hidden />
              </span>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  Keyword Match
                </p>
                <p className="text-sm font-bold leading-tight text-white">
                  24<span className="text-[10px] text-slate-500">/30</span>
                </p>
              </div>
            </div>
          </FloatingDataCard>

          <FloatingDataCard className="-bottom-7 left-4 sm:-left-8" depth={66} delay={1.7} duration={5} connector="up">
            <div className="w-40">
              <div className="flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-fuchsia-300" aria-hidden />
                <p className="text-[10px] font-semibold text-fuchsia-200">AI Rewriting…</p>
                <TypingDots />
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-400"
                  animate={reduced ? undefined : { width: ['34%', '86%', '34%'] }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ width: '58%' }}
                />
              </div>
            </div>
          </FloatingDataCard>

          {/* Status chips */}
          <FloatingChip className="-top-4 right-6 sm:right-10" duration={4.5}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute h-full w-full animate-ping rounded-full bg-cyan-400 opacity-70" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-300" />
            </span>
            <ScanLine className="h-3 w-3 text-cyan-300" aria-hidden />
            Analyzing
          </FloatingChip>

          <FloatingChip className="-right-2 bottom-20 sm:-right-10" delay={1.2} duration={5.5}>
            <BadgeCheck className="h-3.5 w-3.5 text-amber-300" aria-hidden />
            Optimized
          </FloatingChip>
        </motion.div>
      </motion.div>

      {/* Floor reflection */}
      <div className="pointer-events-none absolute -bottom-10 left-1/2 h-20 w-3/4 -translate-x-1/2 rounded-full bg-violet-500/15 blur-3xl" aria-hidden />
    </div>
  );
}
