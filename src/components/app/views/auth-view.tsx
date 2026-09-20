'use client';

/**
 * Login / Register view — "Burgundy & Antique Gold" classical edition.
 * A dark, ornamental 3D scene (see auth-scene.tsx) behind a glass form card
 * that tilts with the pointer and flips in 3D when switching modes.
 * The sign-in page gets its own identity: a dedicated wax-seal emblem in the
 * scene, a returning-guest showcase panel and a remembered-email welcome.
 * All form logic, validation and accessibility wiring is unchanged.
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
    overline: 'The Classical Career Studio',
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
    headingA: 'Where timeless',
    headingEm: 'elegance',
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
      text: 'Print-ready files with classical typography.',
    },
  ],
};

/** Gold-accented brand lockup for the classical scene. */
function BrandLockup() {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d4a548]/50 bg-gradient-to-br from-[#7c1626] to-[#430e19] shadow-[0_8px_24px_-8px_rgba(212,165,72,0.45)]">
        <FileText className="h-6 w-6 text-[#e9c876]" strokeWidth={2} aria-hidden />
      </span>
      <span className="font-serif text-xl font-semibold tracking-tight text-[#f4e9d4]">
        Resume<span className="italic text-[#e9c876]">Recreate</span>
        <span className="text-[#c9b58f]"> AI</span>
      </span>
    </span>
  );
}

/** Small gold ornamental divider (— ◆ —). */
function OrnamentDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4a548]/50" />
      <span className="h-1.5 w-1.5 rotate-45 bg-[#d4a548]/80" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4a548]/50" />
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
    'h-11 rounded-md border-[#d4a548]/25 bg-white/[0.05] text-[#f4e9d4] placeholder:text-[#c9b58f]/50 focus-visible:border-[#d4a548]/60 focus-visible:ring-[#d4a548]/25 dark:bg-white/[0.05]';

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#1a0509]">
      <AuthScene mode={mode} />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* ── Left: classical brand showcase (desktop) ─────────────────── */}
        <aside
          className="relative hidden flex-col justify-center px-12 py-16 xl:px-20 lg:flex"
          aria-label="About Resume Recreate Agent AI"
        >
          {/* ornamental corner frames */}
          <span className="absolute left-8 top-8 h-6 w-6 border-l-2 border-t-2 border-[#d4a548]/40" aria-hidden />
          <span className="absolute right-8 top-8 h-6 w-6 border-r-2 border-t-2 border-[#d4a548]/40" aria-hidden />
          <span className="absolute bottom-8 left-8 h-6 w-6 border-b-2 border-l-2 border-[#d4a548]/40" aria-hidden />
          <span className="absolute bottom-8 right-8 h-6 w-6 border-b-2 border-r-2 border-[#d4a548]/40" aria-hidden />

          <div className="max-w-lg">
            <BrandLockup />

            <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.35em] text-[#d4a548]">
              {showcase.overline}
            </p>
            <h1 className="mt-4 min-h-[10rem] font-serif text-5xl font-bold leading-[1.08] tracking-tight text-[#f4e9d4]">
              {showcase.headingA}{' '}
              <span className="bg-gradient-to-br from-[#f1dc9a] via-[#d4a548] to-[#a87c2e] bg-clip-text italic text-transparent">
                {showcase.headingEm}
              </span>
              {showcase.headingB}
            </h1>
            <p className="mt-5 leading-relaxed text-[#c9b58f]">{showcase.subtext}</p>

            <ul className="mt-10 space-y-5">
              {FEATURES[mode].map((feature) => (
                <li key={feature.title} className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d4a548]/35 bg-white/[0.03]">
                    <feature.icon className="h-5 w-5 text-[#e9c876]" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-medium text-[#f4e9d4]">{feature.title}</span>
                    <span className="block text-sm text-[#c9b58f]">{feature.text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <OrnamentDivider />

            <p className="mt-6 font-serif text-lg italic text-[#c9b58f]">{showcase.quote}</p>
          </div>
        </aside>

        {/* ── Right: the form card ─────────────────────────────────────── */}
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
                  onMouseMove={onCardMove}
                  onMouseLeave={onCardLeave}
                >
                  <Card className="relative min-h-[520px] justify-center gap-4 overflow-hidden border-[#d4a548]/25 bg-[#23060d]/85 py-8 text-[#f4e9d4] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:py-10">
                    <span
                      className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#d4a548]/60 to-transparent"
                      aria-hidden
                    />
                    <CardHeader className="justify-items-center text-center">
                      <div className="lg:hidden">
                        <BrandLockup />
                      </div>
                      {!isRegister && (
                        <span
                          className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d4a548]/40 bg-gradient-to-br from-[#5c1220]/70 to-[#2b0a12]/70 shadow-[inset_0_0_20px_rgba(212,165,72,0.15)]"
                          aria-hidden
                        >
                          <KeyRound className="h-6 w-6 text-[#e9c876]" strokeWidth={1.75} />
                        </span>
                      )}
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.35em] text-[#d4a548]">
                        {copy.overline}
                      </p>
                      <CardTitle className="font-serif text-3xl font-bold tracking-tight text-[#f4e9d4]">
                        {copy.heading}
                      </CardTitle>
                      <div className="w-40">
                        <OrnamentDivider />
                      </div>
                      <CardDescription className="max-w-xs leading-relaxed text-[#c9b58f]">
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
                            <Label htmlFor="name" className="text-[#e2cfa8]">
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
                          <Label htmlFor="email" className="text-[#e2cfa8]">
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
                            <p className="flex items-center gap-1.5 text-xs text-[#d4a548]/85">
                              <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                              Welcome back — we kept your email handy.
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-[#e2cfa8]">
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
                              className="absolute right-0.5 top-1/2 size-11 -translate-y-1/2 text-[#c9b58f] hover:bg-white/5 hover:text-[#e9c876]"
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
                          className="h-11 w-full rounded-md border border-[#d4a548]/40 bg-gradient-to-b from-[#8f1a2c] to-[#671120] text-base text-[#f8ecd7] shadow-[0_10px_30px_-12px_rgba(212,165,72,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:from-[#a32236] hover:to-[#7c1626] hover:shadow-[0_16px_40px_-12px_rgba(212,165,72,0.55)]"
                        >
                          {copy.submit}
                        </LoadingButton>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-1 text-sm text-[#c9b58f]">
              <span>{copy.switchPrompt}</span>
              <Button
                variant="link"
                onClick={() => navigate(isRegister ? 'login' : 'register')}
                className="h-11 px-1 text-[#e9c876] hover:text-[#f4e0a6]"
              >
                {copy.switchAction}
              </Button>
            </div>

            <div className="mt-2 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('landing')}
                className="h-11 text-[#c9b58f] hover:bg-white/5 hover:text-[#f4e9d4]"
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
