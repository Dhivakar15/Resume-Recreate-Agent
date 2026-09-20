'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/app/logo';
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

const COPY = {
  login: {
    heading: 'Welcome back',
    subtext: 'Sign in to keep building, scoring and matching your resumes.',
    submit: 'Sign in',
    loading: 'Signing in…',
    errorTitle: 'Sign in failed',
    switchPrompt: "Don't have an account?",
    switchAction: 'Create one',
  },
  register: {
    heading: 'Create your account',
    subtext: 'Start building ATS-friendly resumes that get past the bots — it only takes a minute.',
    submit: 'Create account',
    loading: 'Creating account…',
    errorTitle: 'Registration failed',
    switchPrompt: 'Already have an account?',
    switchAction: 'Sign in',
  },
} as const;

export function AuthView({ mode }: AuthViewProps) {
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';
  const copy = COPY[mode];

  // Reset transient state when switching between login and register.
  useEffect(() => {
    setApiError(null);
    setErrors({});
    setShowPassword(false);
    setSubmitting(false);
  }, [mode]);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50/70 via-background to-emerald-50/50 px-4 py-10 dark:from-teal-950/20 dark:via-background dark:to-emerald-950/10">
      <div className="w-full max-w-md">
        <Card className="gap-4 py-8 shadow-lg shadow-teal-900/5 sm:py-10">
          <CardHeader className="justify-items-center text-center">
            <Logo size="lg" />
            <CardTitle className="text-2xl font-bold tracking-tight">{copy.heading}</CardTitle>
            <CardDescription className="max-w-xs leading-relaxed">{copy.subtext}</CardDescription>
          </CardHeader>

          <CardContent>
            {apiError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle />
                <AlertTitle>{copy.errorTitle}</AlertTitle>
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
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
                    className="h-11"
                  />
                  {errors.name && (
                    <p id="name-error" className="text-sm text-destructive">
                      {errors.name}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                  className="h-11"
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                    className="h-12 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0.5 top-1/2 size-11 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  </Button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-sm text-destructive">
                    {errors.password}
                  </p>
                )}
              </div>

              <LoadingButton
                type="submit"
                loading={submitting}
                loadingText={copy.loading}
                className="h-11 w-full text-base"
              >
                {copy.submit}
              </LoadingButton>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
          <span>{copy.switchPrompt}</span>
          <Button
            variant="link"
            onClick={() => navigate(isRegister ? 'login' : 'register')}
            className="h-11 px-1 text-teal-600 dark:text-teal-400"
          >
            {copy.switchAction}
          </Button>
        </div>

        <div className="mt-2 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('landing')}
            className="h-11 text-muted-foreground"
          >
            <ArrowLeft aria-hidden />
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}
