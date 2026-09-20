'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { useAuthStore } from '@/stores/auth-store';
import { parseHash, navigate, PROTECTED_VIEWS, type AppRoute } from '@/lib/client/navigation';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { LandingView } from '@/components/app/views/landing-view';
import { AuthView } from '@/components/app/views/auth-view';
import { DashboardView } from '@/components/app/views/dashboard-view';
import { BuilderView } from '@/components/app/views/builder-view';
import { AnalyzerView } from '@/components/app/views/analyzer-view';
import { JobMatchView } from '@/components/app/views/job-match-view';

/**
 * Single-page application shell.
 * The sandbox only exposes the `/` route, so all in-app navigation is
 * hash-based (#/dashboard, #/builder/<id>, ...) and rendered client-side.
 * Backend functionality lives in /api/* route handlers.
 */
export function AppRoot() {
  const { status, init } = useAuthStore();
  const [route, setRoute] = useState<AppRoute>({ view: 'landing' });
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    onHash();
    window.addEventListener('hashchange', onHash);
    init().finally(() => setBooted(true));
    return () => window.removeEventListener('hashchange', onHash);
  }, [init]);

  // Route guard: unauthenticated users get sent to sign in.
  useEffect(() => {
    if (!booted) return;
    if (status === 'guest' && PROTECTED_VIEWS.includes(route.view)) {
      navigate('login');
    }
    if (status === 'authed' && (route.view === 'login' || route.view === 'register')) {
      navigate('dashboard');
    }
    if (status === 'authed' && route.view === 'landing') {
      // signed-in users land straight in the dashboard
      navigate('dashboard');
    }
  }, [booted, status, route.view]);

  if (!booted || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm">Loading Resume Recreate Agent AI…</p>
        </div>
      </div>
    );
  }

  const isProtected = PROTECTED_VIEWS.includes(route.view);
  if (status === 'guest' && isProtected) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <AuthView mode="login" />
        <Toaster />
      </ThemeProvider>
    );
  }

  let content: React.ReactNode;
  switch (route.view) {
    case 'login':
    case 'register':
      content = <AuthView mode={route.view} />;
      break;
    case 'dashboard':
    case 'resumes':
      content = <DashboardView section={route.view === 'resumes' ? 'resumes' : 'overview'} />;
      break;
    case 'builder':
      content = route.id ? <BuilderView resumeId={route.id} /> : <DashboardView section="overview" />;
      break;
    case 'analyzer':
      content = <AnalyzerView preselectedId={route.id} />;
      break;
    case 'jobmatch':
      content = <JobMatchView preselectedId={route.id} />;
      break;
    default:
      content = status === 'authed' ? <DashboardView section="overview" /> : <LandingView />;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {content}
      <Toaster position="top-right" richColors closeButton />
    </ThemeProvider>
  );
}
