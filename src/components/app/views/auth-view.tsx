'use client';

/**
 * Login / Register view — "Midnight Glass" AI SaaS edition.
 * A dark, futuristic neural-network scene (see auth-scene.tsx) behind a
 * floating 3D glass form card: deep backdrop blur, glass reflections, a
 * soft animated outer glow, pointer tilt and a 3D flip when switching
 * modes — visually consistent with the landing page.
 * The sign-in page keeps its own identity: a dedicated AI-core emblem in
 * the scene, a returning-guest showcase panel and a remembered-email
 * welcome. All form logic, validation and accessibility wiring is unchanged.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Eye, EyeOff, FileDown, FileText, Gauge, KeyRound, Sparkles, Wand2, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AuthScene } from '@/components/app/auth/auth-scene';
import { LoadingButton } from '@/components/app/loading-button';
import { navigate } from '@/lib/client/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuthViewProps {
  mode: 'login' | 'register';
}

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** localStorage key for the last successfully signed-in email (welcome-back prefill). */
const LAST_EMAIL_KEY = 'rra_last_email';

const COPY = {
  login: {
    overline: 'The AI Career Studio',
    heading: 'Welcome back',
    subtext: 'Sign in to keep building, scoring and matching your resumes.',
    submit: 'Sign in',
    loading: 'Signing in…',
    errorTitle: 'Sign in failed',
    switchPrompt: "Don't have an account?",
    switchAction: 'Create one',
  },
  register: {
    overline: 'Your Next Chapter Begins',
    heading: 'Create your account',
    subtext: 'Start building ATS-friendly resumes that get past the bots — it only takes a minute.',
    submit: 'Create account',
    loading: 'Creating account…',
    errorTitle: 'Registration failed',
    switchPrompt: 'Already have an account?',
    switchAction: 'Sign in',
  },
} as const;

/** Mode-aware copy for the desktop showcase panel beside the form. */
const SHOWCASE = {
  login: {
    overline: 'The Studio Awaits Your Return',
    headingA: 'Good to see you',
    headingEm: 'again',
    headingB: '.',
    subtext:
      'Your resumes, scores and role matches are exactly where you left them — step back in and pick up the thread in minutes.',
    quote: '“Every great story deserves a second draft.”',
  },
  register: {
    overline: 'Your Next Chapter Begins',
    headingA: 'Where',
    headingEm: 'intelligence',
    headingB: ' meets your career.',
    subtext:
      'Create your account to polish every bullet with AI, score your ATS readiness and match yourself to the roles you deserve — all in one refined studio.',
    quote: '“First impressions, beautifully engineered.”',
  },
} as const;

interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
}

/** Returning guests and newcomers hear a different pitch. */
const FEATURES: Record<'login' | 'register', Feature[]> = {
  login: [
    {
      icon: KeyRound,
      title: 'Everything awaits',
      text: 'Resumes, versions and analyses — preserved exactly as you left them.',
    },
    {
      icon: Gauge,
      title: 'Revisit your ATS standing',
      text: 'Re-check your AI Estimated ATS Score whenever you like.',
    },
    {
      icon: FileDown,
      title: 'Re-export in seconds',
      text: 'Fresh PDF & LaTeX files, whenever you need them.',
    },
  ],
  register: [
    {
      icon: Wand2,
      title: 'AI polish, fact-safe',
      text: 'Every bullet point refined — never invented.',
    },
    {
      icon: Gauge,
      title: 'AI Estimated ATS Score',
      text: 'See how robot recruiters read your resume.',
    },
    {
      icon: FileDown,
      title: 'PDF & LaTeX exports',
      text: 'Print-ready, recruiter-friendly files.',
    },
  ],
};

/** Violet/cyan-accented brand lockup for the AI scene. */
function BrandLockup() {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-600/40 to-blue-600/20 shadow-[0_8px_30px_-8px_rgba(139,92,246,0.65)] backdrop-blur-xl">
        <FileText className="h-6 w-6 text-violet-200" strokeWidth={2} aria-hidden />
      </span>
      <span className="whitespace-nowrap text-base font-semibold tracking-tight text-white sm:text-xl">
        Resume
        <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
          Recreate
        </span>{' '}
        Agent<span className="text-slate-400"> AI</span>
      </span>
    </span>
  );
}

/** Subtle glowing divider (— ◆ —) with a cyan spark. */
function GlowDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-violet-400/50" />
      <span className="h-1.5 w-1.5 rotate-45 bg-gradient-to-br from-cyan-300 to-violet-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-violet-400/50" />
    </div>
  );
}

export function AuthView({ mode }: AuthViewProps) {
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const reduced = useReducedMotion();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);

  // Ref mirror of `email` so the mode effect below can read it without re-running.
  const emailRef = useRef('');
  useEffect(() => {
    emailRef.current = email;
  }, [email]);

  const isRegister = mode === 'register';
  const copy = COPY[mode];
  const showcase = SHOWCASE[mode];

  // Reset transient state when switching between login and register, and
  // offer the remembered email when the guest returns to the sign-in page.
  useEffect(() => {
    setApiError(null);
    setErrors({});
    setShowPassword(false);
    setSubmitting(false);
    if (mode === 'login' && emailRef.current.trim() === '') {
      try {
        const saved = window.localStorage.getItem(LAST_EMAIL_KEY);
        if (saved) {
          setEmail(saved);
          setRememberedEmail(saved);
        }
      } catch {
        // Storage unavailable — the form simply stays empty.
      }
    }
  }, [mode]);

  // 3D tilt on the form card (pointer only; disabled for reduced motion).
  const tiltSourceX = useMotionValue(0);
  const tiltSourceY = useMotionValue(0);
  const tiltX = useSpring(tiltSourceX, { stiffness: 140, damping: 18 });
  const tiltY = useSpring(tiltSourceY, { stiffness: 140, damping: 18 });

  function onCardMove(event: React.MouseEvent<HTMLDivElement>) {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    tiltSourceY.set(px * 6);
    tiltSourceX.set(-py * 6);
  }

  function onCardLeave() {
    tiltSourceX.set(0);
    tiltSourceY.set(0);
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (isRegister) {
      if (!name.trim()) {
        next.name = 'Full name is required.';
      } else if (name.trim().length < 2) {
        next.name = 'Name must be at least 2 characters.';
      }
    }
    if (!email.trim()) {
      next.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (!password) {
      next.password = 'Password is required.';
    } else if (isRegister) {
      if (password.length < 8) {
        next.password = 'Password must be at least 8 characters.';
      } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        next.password = 'Password must contain at least one letter and one number.';
      }
    }
    return next;
  }

  function clearFieldError(field: keyof FieldErrors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email || nextErrors.password) return;

    setSubmitting(true);
    setApiError(null);
    try {
      if (isRegister) {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
        // Remember the email for a warmer welcome next time (best effort).
        try {
          window.localStorage.setItem(LAST_EMAIL_KEY, email.trim());
        } catch {
          // Storage unavailable — signing in still works.
        }
      }
      navigate('dashboard');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setApiError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'h-11 rounded-md border-white/10 bg-white/[0.06] text-slate-100 placeholder:text-slate-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/25';

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#04050d]">
      <AuthScene mode={mode} />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* ── Left: AI brand showcase (desktop) ───────────────────────── */}
        <aside
          className="relative hidden flex-col justify-center px-12 py-16 xl:px-20 lg:flex"
          aria-label="About Resume Recreate Agent AI"
        >
          {/* HUD corner frames */}
          <span className="absolute left-8 top-8 h-6 w-6 border-l-2 border-t-2 border-cyan-300/30" aria-hidden />
          <span className="absolute right-8 top-8 h-6 w-6 border-r-2 border-t-2 border-cyan-300/30" aria-hidden />
          <span className="absolute bottom-8 left-8 h-6 w-6 border-b-2 border-l-2 border-cyan-300/30" aria-hidden />
          <span className="absolute bottom-8 right-8 h-6 w-6 border-b-2 border-r-2 border-cyan-300/30" aria-hidden />

          <div className="max-w-lg">
            <BrandLockup />

            <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.35em] text-cyan-300/90">
              {showcase.overline}
            </p>
            <h1 className="mt-4 min-h-[10rem] text-5xl font-bold leading-[1.08] tracking-tight text-white">
              {showcase.headingA}{' '}
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                {showcase.headingEm}
              </span>
              {showcase.headingB}
            </h1>
            <p className="mt-5 leading-relaxed text-slate-400">{showcase.subtext}</p>

            <ul className="mt-10 space-y-5">
              {FEATURES[mode].map((feature) => (
                <li key={feature.title} className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                    <feature.icon className="h-5 w-5 text-cyan-300" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-medium text-slate-100">{feature.title}</span>
                    <span className="block text-sm text-slate-400">{feature.text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <GlowDivider />
            </div>

            <p className="mt-6 text-lg italic text-slate-400">{showcase.quote}</p>
          </div>
        </aside>

        {/* ── Right: the floating 3D glass form card ──────────────────── */}
        <main className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md [perspective:1600px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={reduced ? { opacity: 0 } : { rotateY: 70, opacity: 0, scale: 0.96 }}
                animate={reduced ? { opacity: 1 } : { rotateY: 0, opacity: 1, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { rotateY: -70, opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <motion.div
                  style={reduced ? undefined : { rotateX: tiltX, rotateY: tiltY, transformStyle: 'preserve-3d' }}
                  animate={reduced ? undefined : { y: [0, -8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  onMouseMove={onCardMove}
                  onMouseLeave={onCardLeave}
                >
                  <div className="relative">
                    {/* Soft animated outer glow — the card floats in light */}
                    <motion.div
                      className="absolute -inset-5 rounded-[2rem] bg-gradient-to-r from-violet-600/25 via-fuchsia-600/15 to-cyan-500/20 blur-2xl"
                      animate={reduced ? undefined : { opacity: [0.55, 0.95, 0.55] }}
                      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                      aria-hidden
                    />

                    <Card className="relative min-h-[520px] justify-center gap-4 overflow-hidden rounded-2xl border-white/10 bg-white/[0.05] py-8 text-slate-100 shadow-[0_40px_100px_-30px_rgba(76,29,149,0.6)] backdrop-blur-2xl sm:py-10">
                      {/* glass top-edge reflection */}
                      <span
                        className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        aria-hidden
                      />
                      {/* slow diagonal light sweep across the glass */}
                      <motion.span
                        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent"
                        animate={reduced ? undefined : { x: ['-45%', '45%'] }}
                        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                        aria-hidden
                      />

                      <CardHeader className="justify-items-center text-center">
                        <div className="lg:hidden">
                          <BrandLockup />
                        </div>
                        {!isRegister && (
                          <span
                            className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/30 bg-gradient-to-br from-violet-600/25 to-blue-600/15 shadow-[inset_0_0_20px_rgba(56,189,248,0.15)]"
                            aria-hidden
                          >
                            <KeyRound className="h-6 w-6 text-cyan-200" strokeWidth={1.75} />
                          </span>
                        )}
                        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.35em] text-cyan-300/90">
                          {copy.overline}
                        </p>
                        <CardTitle className="text-3xl font-bold tracking-tight text-white">
                          {copy.heading}
                        </CardTitle>
                        <div className="w-40">
                          <GlowDivider />
                        </div>
                        <CardDescription className="max-w-xs leading-relaxed text-slate-400">
                          {copy.subtext}
                        </CardDescription>
                      </CardHeader>

                      <CardContent>
                        {apiError && (
                          <Alert
                            variant="destructive"
                            className="mb-6 border-red-400/30 bg-red-500/10 text-red-200 [&>svg]:text-red-300"
                          >
                            <AlertCircle aria-hidden />
                            <AlertTitle>{copy.errorTitle}</AlertTitle>
                            <AlertDescription className="text-red-200/80">{apiError}</AlertDescription>
                          </Alert>
                        )}

                        <form onSubmit={handleSubmit} noValidate className="space-y-5">
                          {isRegister && (
                            <div className="space-y-2">
                              <Label htmlFor="name" className="text-slate-300">
                                Full name
                              </Label>
                              <Input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                placeholder="Ada Lovelace"
                                value={name}
                                onChange={(event) => {
                                  setName(event.target.value);
                                  clearFieldError('name');
                                }}
                                aria-invalid={Boolean(errors.name)}
                                aria-describedby={errors.name ? 'name-error' : undefined}
                                className={inputClass}
                              />
                              {errors.name && (
                                <p id="name-error" className="text-sm text-red-300/90">
                                  {errors.name}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">
                              Email
                            </Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              autoComplete="email"
                              placeholder="you@example.com"
                              value={email}
                              onChange={(event) => {
                                setEmail(event.target.value);
                                clearFieldError('email');
                              }}
                              aria-invalid={Boolean(errors.email)}
                              aria-describedby={errors.email ? 'email-error' : undefined}
                              className={inputClass}
                            />
                            {errors.email && (
                              <p id="email-error" className="text-sm text-red-300/90">
                                {errors.email}
                              </p>
                            )}
                            {mode === 'login' && rememberedEmail && email === rememberedEmail && !errors.email && (
                              <p className="flex items-center gap-1.5 text-xs text-cyan-300/90">
                                <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                                Welcome back — we kept your email handy.
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">
                              Password
                            </Label>
                            <div className="relative">
                              <Input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete={isRegister ? 'new-password' : 'current-password'}
                                placeholder={isRegister ? 'At least 8 characters' : 'Your password'}
                                value={password}
                                onChange={(event) => {
                                  setPassword(event.target.value);
                                  clearFieldError('password');
                                }}
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={errors.password ? 'password-error' : undefined}
                                className={inputClass + ' h-12 pr-12'}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowPassword((visible) => !visible)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                className="absolute right-0.5 top-1/2 size-11 -translate-y-1/2 text-slate-400 hover:bg-white/5 hover:text-cyan-200"
                              >
                                {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                              </Button>
                            </div>
                            {errors.password && (
                              <p id="password-error" className="text-sm text-red-300/90">
                                {errors.password}
                              </p>
                            )}
                          </div>

                          <LoadingButton
                            type="submit"
                            loading={submitting}
                            loadingText={copy.loading}
                            className="h-11 w-full rounded-md bg-gradient-to-r from-violet-600 via-fuchsia-600 to-blue-600 text-base font-semibold text-white shadow-[0_10px_36px_-10px_rgba(139,92,246,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-12px_rgba(139,92,246,0.85)] hover:brightness-110"
                          >
                            {copy.submit}
                          </LoadingButton>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-1 text-sm text-slate-400">
              <span>{copy.switchPrompt}</span>
              <Button
                variant="link"
                onClick={() => navigate(isRegister ? 'login' : 'register')}
                className="h-11 px-1 text-cyan-300 hover:text-cyan-200"
              >
                {copy.switchAction}
              </Button>
            </div>

            <div className="mt-2 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('landing')}
                className="h-11 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft aria-hidden />
                Back to home
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
