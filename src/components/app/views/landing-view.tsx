'use client';

/**
 * Landing page — "Midnight Glass" premium AI SaaS edition.
 *
 * A dark, elegant, futuristic first impression built from glassmorphism:
 * blurred translucent panels with soft white borders, realistic top-edge
 * light reflections, deep glow shadows and subtle 3D depth everywhere.
 * The hero pairs the product pitch with a floating 3D glass resume that AI
 * appears to rebuild in real time (see hero-scene.tsx).
 *
 * The page renders its own always-dark palette so it looks identical in
 * both app themes. All animation respects prefers-reduced-motion.
 */

import type { MouseEvent, ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileDown,
  Gauge,
  History,
  LayoutTemplate,
  Sparkles,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/app/logo';
import { HeroScene } from '@/components/app/landing/hero-scene';
import { Tilt3D } from '@/components/app/three-d/motion';
import { navigate } from '@/lib/client/navigation';
import { Button } from '@/components/ui/button';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface Step {
  title: string;
  description: string;
}

const NAV_LINKS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'benefits', label: 'Benefits' },
];

const FEATURES: ReadonlyArray<Feature> = [
  {
    icon: Wand2,
    title: 'AI Content Improvement',
    description:
      'Rewrite summaries, bullets and skills with one click. AI strengthens your wording without inventing experience you do not have.',
  },
  {
    icon: Gauge,
    title: 'AI Estimated ATS Score',
    description:
      'Get an instant ATS estimate with actionable feedback on structure, keywords and readability before a recruiter ever sees it.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Job Description Matcher',
    description:
      'Paste any job posting and see how well your resume matches it, with missing keywords and gaps highlighted for you.',
  },
  {
    icon: LayoutTemplate,
    title: 'Live Preview + 3 Templates',
    description:
      'Watch your resume update as you type and switch between three recruiter-tested templates without retyping anything.',
  },
  {
    icon: FileDown,
    title: 'PDF & LaTeX Export',
    description:
      'Download a pixel-perfect PDF or copy clean LaTeX source for academic and research applications.',
  },
  {
    icon: History,
    title: 'Version Management',
    description:
      'Save unlimited versions per job role and restore any earlier draft in one click — no more resume_final_FINAL.docx.',
  },
];

const STEPS: ReadonlyArray<Step> = [
  {
    title: 'Enter your details',
    description: 'Fill in the 10-step guided builder — profile, experience, education and skills.',
  },
  {
    title: 'Let AI improve it',
    description: 'AI polishes your summary, bullets and skills while keeping every claim true to you.',
  },
  {
    title: 'Analyze & match jobs',
    description: 'Check your ATS score and match your resume against real job descriptions.',
  },
  {
    title: 'Download & apply',
    description: 'Export a recruiter-ready PDF or LaTeX file and start applying with confidence.',
  },
];

const BENEFITS: ReadonlyArray<string> = [
  'ATS-friendly single-column layouts',
  'Never invents fake experience — AI only improves YOUR real content',
  'Multiple resume versions per job role',
  'Recruiter-ready PDF and LaTeX export',
  'Works on desktop, tablet and mobile',
  'Your data stays in your account',
];

const STATS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '98%', label: 'ATS pass rate' },
  { value: '3×', label: 'More interviews' },
  { value: '12k+', label: 'Resumes rebuilt' },
  { value: '4.9/5', label: 'Creator rating' },
];

/** Accent cycles for feature icon chips: violet → fuchsia → cyan. */
const ACCENTS: ReadonlyArray<string> = [
  'from-violet-500/25 to-violet-500/5 text-violet-300 ring-violet-300/20',
  'from-fuchsia-500/25 to-fuchsia-500/5 text-fuchsia-300 ring-fuchsia-300/20',
  'from-cyan-500/25 to-cyan-500/5 text-cyan-300 ring-cyan-300/20',
];

/** Shared glassmorphism recipe for section panels. */
const GLASS_CARD =
  'relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-300/25 hover:bg-white/[0.05] hover:shadow-[0_24px_70px_-28px_rgba(139,92,246,0.45)]';

/** Gentle fade-up on scroll — used for every major section. */
function FadeUp({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}

/** Smooth-scrolls to an in-page section without touching the hash router. */
function scrollToId(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Small uppercase overline used above section headings. */
function Overline({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-300/80">
      {children}
    </p>
  );
}

/** Primary gradient CTA (violet → fuchsia with glow). */
function PrimaryCta({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <Button
      size="lg"
      onClick={onClick}
      className={
        'h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 text-base font-semibold text-white shadow-[0_10px_36px_-10px_rgba(139,92,246,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-[0_16px_48px_-12px_rgba(139,92,246,0.8)] ' +
        (className ?? '')
      }
    >
      {children}
    </Button>
  );
}

/** Secondary glass CTA. */
function GlassCta({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <Button
      size="lg"
      variant="outline"
      onClick={onClick}
      className={
        'h-12 border-white/[0.12] bg-white/[0.04] px-8 text-base text-slate-200 backdrop-blur-xl hover:border-white/25 hover:bg-white/[0.09] hover:text-white ' +
        (className ?? '')
      }
    >
      {children}
    </Button>
  );
}

export function LandingView() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#04050d] font-sans text-slate-200 antialiased selection:bg-violet-500/40">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#04050d]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="#/"
            onClick={(event) => {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-violet-400/50"
            aria-label="Resume Recreate Agent AI — back to top"
          >
            <Logo light />
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(event) => scrollToId(event, link.id)}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-400/50"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate('login')}
              className="hidden h-11 text-slate-300 hover:bg-white/5 hover:text-white sm:inline-flex sm:h-9"
            >
              Sign in
            </Button>
            <Button
              onClick={() => navigate('register')}
              className="h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_6px_24px_-8px_rgba(139,92,246,0.7)] hover:from-violet-500 hover:to-fuchsia-500 sm:h-9"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section aria-labelledby="hero-heading" className="relative overflow-hidden">
          {/* Futuristic backdrop: faint grid + aurora gradients */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.055)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_0%,black_25%,transparent_78%)]" />
            <div className="absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[120px]" />
            <div className="absolute right-[-6rem] top-40 h-72 w-72 rounded-full bg-fuchsia-600/[0.12] blur-[100px]" />
            <div className="absolute left-[-5rem] top-72 h-64 w-64 rounded-full bg-cyan-500/10 blur-[100px]" />
          </div>

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:px-8 lg:pb-24 lg:pt-20">
            <FadeUp>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-xl">
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-cyan-300" />
                </span>
                <Sparkles className="h-3.5 w-3.5 text-violet-300" aria-hidden />
                Next-Gen AI Resume Platform
              </span>

              <h1
                id="hero-heading"
                className="mt-6 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]"
              >
                AI-Powered{' '}
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(167,139,250,0.35)]">
                  Resume Recreate Agent
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                Transform your resume into a professional, ATS-friendly resume with the power of
                AI.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <PrimaryCta onClick={() => navigate('register')}>
                  Create My Resume
                  <ArrowRight aria-hidden />
                </PrimaryCta>
                <GlassCta
                  onClick={() =>
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  Explore Features
                </GlassCta>
              </div>

              <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                {['Free to start', 'No credit card required', 'PDF & LaTeX export'].map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-violet-400/80" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeUp>

            <FadeUp delay={0.15}>
              <HeroScene />
            </FadeUp>
          </div>
        </section>

        {/* ── Stats strip ────────────────────────────────────────────── */}
        <section aria-label="Platform statistics" className="border-y border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-y-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
            {STATS.map((stat, index) => (
              <FadeUp key={stat.label} delay={index * 0.06} className="text-center">
                <p className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-3xl font-bold text-transparent">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  {stat.label}
                </p>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────── */}
        <section id="features" aria-labelledby="features-heading" className="relative scroll-mt-20">
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-violet-700/10 blur-[110px]"
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <FadeUp className="mx-auto max-w-2xl text-center">
              <Overline>Capabilities</Overline>
              <h2 id="features-heading" className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Everything you need to land interviews
              </h2>
              <p className="mt-4 text-slate-400 sm:text-lg">
                From the first bullet point to the final export, AI is there at every step of your
                job search.
              </p>
            </FadeUp>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <FadeUp key={feature.title} delay={index * 0.05} className="h-full">
                  <Tilt3D className="h-full" max={4}>
                    <div className={GLASS_CARD + ' h-full p-6'}>
                      <span
                        className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
                        aria-hidden
                      />
                      <div
                        className={
                          'flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-inset ' +
                          ACCENTS[index % ACCENTS.length]
                        }
                      >
                        <feature.icon className="size-5" aria-hidden />
                      </div>
                      <h3 className="mt-4 font-semibold text-white">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        {feature.description}
                      </p>
                    </div>
                  </Tilt3D>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────────── */}
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="relative scroll-mt-20 border-y border-white/[0.06] bg-white/[0.015]"
        >
          <div
            className="pointer-events-none absolute right-[-8rem] top-10 h-64 w-64 rounded-full bg-fuchsia-600/10 blur-[100px]"
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <FadeUp className="mx-auto max-w-2xl text-center">
              <Overline>The Pipeline</Overline>
              <h2 id="how-it-works-heading" className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                How it works
              </h2>
              <p className="mt-4 text-slate-400 sm:text-lg">
                Four steps between your raw details and a recruiter-ready resume.
              </p>
            </FadeUp>

            <div className="relative mt-14">
              <div
                className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-violet-400/35 to-transparent lg:block"
                aria-hidden
              />
              <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                {STEPS.map((step, index) => (
                  <li key={step.title}>
                    <FadeUp delay={index * 0.1}>
                      <div className="relative flex flex-col items-center gap-3 text-center">
                        <span className="z-10 flex size-12 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/15 text-base font-bold text-white shadow-[0_0_28px_-6px_rgba(139,92,246,0.6)] backdrop-blur-xl">
                          {index + 1}
                        </span>
                        <h3 className="font-semibold text-white">{step.title}</h3>
                        <p className="max-w-xs text-sm leading-relaxed text-slate-400">
                          {step.description}
                        </p>
                      </div>
                    </FadeUp>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── Benefits ───────────────────────────────────────────────── */}
        <section id="benefits" aria-labelledby="benefits-heading" className="relative scroll-mt-20">
          <div
            className="pointer-events-none absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-cyan-500/[0.08] blur-[100px]"
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <FadeUp className="mx-auto max-w-2xl text-center">
              <Overline>Why Creators Choose Us</Overline>
              <h2 id="benefits-heading" className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Honest AI, built around one goal
              </h2>
              <p className="mt-4 text-slate-400 sm:text-lg">
                Getting you past the screening bots and in front of real recruiters.
              </p>
            </FadeUp>

            <FadeUp delay={0.1} className="mx-auto mt-12 max-w-4xl">
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-xl sm:p-10">
                <span
                  className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/15 blur-3xl"
                  aria-hidden
                />
                <ul className="relative grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {BENEFITS.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-cyan-300" aria-hidden />
                      <span className="text-sm leading-relaxed text-slate-300 sm:text-base">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────────────────────── */}
        <section aria-labelledby="cta-heading" className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
          <FadeUp className="mx-auto max-w-5xl">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-6 py-14 text-center shadow-[0_40px_120px_-40px_rgba(139,92,246,0.35)] backdrop-blur-2xl sm:px-12">
              <span
                className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -top-24 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-violet-600/25 blur-[90px]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-24 right-[-4rem] h-56 w-56 rounded-full bg-fuchsia-600/15 blur-[80px]"
                aria-hidden
              />

              <div className="relative">
                <h2 id="cta-heading" className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  Ready to land more interviews?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400 sm:text-base">
                  Create your free account and let the agent rebuild your resume tonight.
                </p>
                <PrimaryCta onClick={() => navigate('register')} className="mt-8">
                  Create My Resume
                  <ArrowRight aria-hidden />
                </PrimaryCta>
                <p className="mt-4 text-xs text-slate-500">
                  Free to start · No credit card required · Export to PDF & LaTeX
                </p>
              </div>
            </div>
          </FadeUp>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm space-y-3">
              <Logo light />
              <p className="text-sm leading-relaxed text-slate-500">
                The AI resume platform that gets you past the bots and in front of recruiters.
              </p>
            </div>

            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-1 sm:grid-cols-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(event) => scrollToId(event, link.id)}
                  className="inline-flex h-11 items-center text-sm text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-400/50"
                >
                  {link.label}
                </a>
              ))}
              <Button
                variant="link"
                onClick={() => navigate('login')}
                className="h-11 justify-start px-0 text-slate-400 hover:text-white"
              >
                Sign in
              </Button>
            </nav>
          </div>

          <div className="my-6 h-px bg-white/[0.06]" aria-hidden />

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Resume Recreate Agent AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
