'use client';

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
  Target,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/app/logo';
import { HeroScene } from '@/components/app/landing/hero-scene';
import { Tilt3D } from '@/components/app/three-d/motion';
import { navigate } from '@/lib/client/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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

/** Slow vertical float + gentle 3D wobble for the hero mockup badges. */
function FloatBadge({ children, className, delay = 0, duration = 5 }: { children: ReactNode; className?: string; delay?: number; duration?: number }) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -8, 0], rotate: [-1.5, 1.5, -1.5] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
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

/** CSS-only resume paper mockup with floating AI badges. */
function ResumePaperMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden>
      {/* Paper */}
      <div className="relative rounded-xl border border-[#d4a548]/30 bg-card p-6 shadow-2xl shadow-[#4c1d95]/10 sm:p-7 dark:border-border">
        <div className="h-4 w-36 rounded-full bg-foreground/80" />
        <div className="mt-2.5 h-2.5 w-44 rounded-full bg-muted-foreground/40" />
        <div className="mt-5 h-px w-full bg-border" />

        <div className="mt-5 h-2.5 w-16 rounded-full bg-[#6d28d9]/80" />
        <div className="mt-3 space-y-2">
          <div className="h-2 w-full rounded-full bg-muted" />
          <div className="h-2 w-11/12 rounded-full bg-muted" />
          <div className="h-2 w-3/4 rounded-full bg-muted" />
        </div>

        <div className="mt-5 h-2.5 w-20 rounded-full bg-[#6d28d9]/80" />
        <div className="mt-3 space-y-2">
          <div className="h-2 w-full rounded-full bg-muted" />
          <div className="h-2 w-5/6 rounded-full bg-muted" />
        </div>

        <div className="mt-5 h-2.5 w-14 rounded-full bg-[#6d28d9]/80" />
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="h-6 w-14 rounded-full bg-[#8a6d1f]/15" />
          <div className="h-6 w-20 rounded-full bg-[#8a6d1f]/15" />
          <div className="h-6 w-12 rounded-full bg-[#8a6d1f]/15" />
          <div className="h-6 w-16 rounded-full bg-[#8a6d1f]/15" />
          <div className="h-6 w-14 rounded-full bg-[#8a6d1f]/15" />
        </div>
      </div>

      {/* Floating badges */}
      <FloatBadge className="absolute -top-5 -left-1 sm:-left-8" duration={5.5}>
        <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#6d28d9] px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-[#4c1d95]/30">
          <Gauge className="h-3.5 w-3.5" />
          AI Estimated ATS Score 87
        </span>
      </FloatBadge>
      <FloatBadge className="absolute top-1/2 -right-1 sm:-right-8" delay={0.8} duration={4.5}>
        <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#8a6d1f] px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-[#8a6d1f]/30">
          <Target className="h-3.5 w-3.5" />
          Keyword Match 12/15
        </span>
      </FloatBadge>
      <FloatBadge className="absolute -bottom-5 left-6" delay={1.6} duration={6}>
        <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg">
          <FileDown className="h-3.5 w-3.5 text-[#8a6d1f]" />
          PDF + LaTeX
        </span>
      </FloatBadge>
    </div>
  );
}

export function LandingView() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-[#fbf8f0] text-foreground dark:bg-background">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#d4a548]/30 bg-[#fbf8f0]/85 backdrop-blur-md dark:border-border/60 dark:bg-background/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="#/"
            onClick={(event) => {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label="Resume Recreate Agent AI — back to top"
          >
            <Logo />
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(event) => scrollToId(event, link.id)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate('login')}
              className="hidden h-11 sm:inline-flex sm:h-9"
            >
              Sign in
            </Button>
            <Button onClick={() => navigate('register')} className="h-11 sm:h-9">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section
          aria-labelledby="hero-heading"
          className="relative overflow-hidden bg-gradient-to-b from-[#f5efdc] via-[#f2edda] to-[#fbf8f0] dark:from-violet-950/20 dark:via-purple-950/10 dark:to-background"
        >
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#d4a548]/30 blur-3xl dark:bg-[#d4a548]/10" aria-hidden />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-500/10" aria-hidden />

          {/* Floating 3D glass cubes, resume sheets and gold dust */}
          <HeroScene />

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
            <FadeUp>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c9a04a]/50 bg-[#d4a548]/15 px-3 py-1 text-xs font-medium text-[#7a5f1d] dark:border-[#d4a548]/30 dark:bg-[#d4a548]/10 dark:text-[#d9b95c]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                AI-Powered Resume Platform
              </span>

              <h1 id="hero-heading" className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Build an{' '}
                <span className="bg-gradient-to-r from-[#4a1d6e] via-[#6d28d9] to-[#9a7a26] bg-clip-text text-transparent dark:from-violet-300 dark:via-violet-400 dark:to-[#d4a548]">
                  ATS-Friendly
                </span>{' '}
                Resume with AI
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Let AI organize and improve your content, then score it against real ATS checks and
                match it to the jobs you want. Export a recruiter-ready resume as PDF or LaTeX in
                minutes.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => navigate('register')}
                  className="h-12 bg-[#6d28d9] px-8 text-base text-white shadow-lg shadow-[#4c1d95]/30 hover:bg-[#5b21b6] dark:bg-[#7c3aed] dark:text-white dark:hover:bg-[#8b5cf6]"
                >
                  Create Resume
                  <ArrowRight aria-hidden />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('register')}
                  className="h-12 px-8 text-base"
                >
                  Get Started
                </Button>
              </div>
            </FadeUp>

            <FadeUp delay={0.15}>
              <Tilt3D max={8}>
                <ResumePaperMockup />
              </Tilt3D>
            </FadeUp>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section id="features" aria-labelledby="features-heading" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <FadeUp className="mx-auto max-w-2xl text-center">
              <h2 id="features-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to land interviews
              </h2>
              <p className="mt-4 text-muted-foreground sm:text-lg">
                From the first bullet point to the final export, AI is there at every step of your
                job search.
              </p>
            </FadeUp>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <FadeUp key={feature.title} delay={index * 0.05} className="h-full">
                  <Tilt3D className="h-full" max={5}>
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardHeader>
                        <div className="flex size-11 items-center justify-center rounded-lg bg-[#f0eafb] text-[#6d28d9] ring-1 ring-[#a78bfa]/40 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/25">
                          <feature.icon className="size-5" aria-hidden />
                        </div>
                        <CardTitle className="text-base">{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="leading-relaxed">
                          {feature.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </Tilt3D>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="scroll-mt-20 border-y border-[#d4a548]/25 bg-[#f6f1e1] dark:border-border/60 dark:bg-muted/10"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <FadeUp className="mx-auto max-w-2xl text-center">
              <h2 id="how-it-works-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                How it works
              </h2>
              <p className="mt-4 text-muted-foreground sm:text-lg">
                Four steps between your raw details and a recruiter-ready resume.
              </p>
            </FadeUp>

            <div className="relative mt-14">
              <div
                className="absolute left-0 right-0 top-6 hidden h-px bg-[#d4a548]/45 lg:block dark:bg-border"
                aria-hidden
              />
              <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                {STEPS.map((step, index) => (
                  <li key={step.title}>
                    <FadeUp delay={index * 0.1}>
                      <div className="relative flex flex-col items-center gap-3 text-center">
                        <span className="z-10 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[#6d28d9] to-[#4c1d95] text-base font-semibold text-white shadow-md shadow-[#4c1d95]/30 ring-4 ring-[#f6f1e1] dark:ring-background">
                          {index + 1}
                        </span>
                        <h3 className="font-semibold">{step.title}</h3>
                        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
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

        {/* ── Benefits ─────────────────────────────────────────── */}
        <section id="benefits" aria-labelledby="benefits-heading" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <FadeUp className="mx-auto max-w-2xl text-center">
              <h2 id="benefits-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Why job seekers choose us
              </h2>
              <p className="mt-4 text-muted-foreground sm:text-lg">
                Honest AI assistance built around one goal: getting you past the screening bots.
              </p>
            </FadeUp>

            <FadeUp delay={0.1} className="mx-auto mt-12 max-w-4xl">
              <div className="rounded-2xl border border-[#d4a548]/30 bg-card p-6 shadow-sm sm:p-10 dark:border-border">
                <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {BENEFITS.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle2
                        className="mt-0.5 size-5 shrink-0 text-[#6d28d9] dark:text-violet-400"
                        aria-hidden
                      />
                      <span className="text-sm leading-relaxed sm:text-base">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────── */}
        <section aria-labelledby="cta-heading" className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
          <FadeUp className="mx-auto max-w-5xl">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3b1163] via-[#4c1d95] to-[#6d28d9] px-6 py-12 text-center shadow-xl shadow-[#2a0a4a]/30 sm:px-12 lg:py-16">
              <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#d4a548]/25 blur-2xl" aria-hidden />

              <div className="relative">
                <h2 id="cta-heading" className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  Ready to land more interviews?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-violet-50 sm:text-base">
                  Create your free account and build an ATS-friendly resume today.
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate('register')}
                  className="mt-8 h-12 bg-white px-8 text-base font-semibold text-[#3b1163] hover:bg-[#f3efdf]"
                >
                  Create Resume
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            </div>
          </FadeUp>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-[#d4a548]/25 bg-[#f6f1e1]/70 dark:border-border dark:bg-card/50">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm space-y-3">
              <Logo />
              <p className="text-sm leading-relaxed text-muted-foreground">
                The AI resume platform that gets you past the bots and in front of recruiters.
              </p>
            </div>

            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-1 sm:grid-cols-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(event) => scrollToId(event, link.id)}
                  className="inline-flex h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {link.label}
                </a>
              ))}
              <Button
                variant="link"
                onClick={() => navigate('login')}
                className="h-11 justify-start px-0 text-muted-foreground hover:text-foreground"
              >
                Sign in
              </Button>
            </nav>
          </div>

          <Separator className="my-6" />

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Resume Recreate Agent AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
