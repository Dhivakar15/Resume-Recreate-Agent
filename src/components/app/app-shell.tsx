'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Logo } from '@/components/app/logo';
import { useAuthStore } from '@/stores/auth-store';
import { navigate } from '@/lib/client/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Files,
  ScanSearch,
  BriefcaseBusiness,
  LogOut,
  Moon,
  Sun,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ShellActive = 'overview' | 'resumes' | 'analyzer' | 'jobmatch';

const NAV: { key: ShellActive; label: string; icon: React.ElementType; view: 'dashboard' | 'resumes' | 'analyzer' | 'jobmatch' }[] = [
  { key: 'overview', label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { key: 'resumes', label: 'My Resumes', icon: Files, view: 'resumes' },
  { key: 'analyzer', label: 'AI Resume Analyzer', icon: ScanSearch, view: 'analyzer' },
  { key: 'jobmatch', label: 'Job Description Match', icon: BriefcaseBusiness, view: 'jobmatch' },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      className="min-h-[44px] min-w-[44px]"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-4 w-4 dark:hidden" aria-hidden />
      <Moon className="hidden h-4 w-4 dark:block" aria-hidden />
    </Button>
  );
}

function NavItems({ active, onNavigate }: { active: ShellActive; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation" className="space-y-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              navigate(item.view);
              onNavigate?.();
            }}
            aria-current={active === item.key ? 'page' : undefined}
            className={cn(
              'flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active === item.key
                ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function UserCard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white" aria-hidden>
          {(user?.name ?? 'U').slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        className="mt-2 min-h-[40px] w-full justify-start gap-2 text-muted-foreground"
        onClick={async () => {
          await logout();
          toast.success('Signed out. See you soon!');
          navigate('landing');
        }}
      >
        <LogOut className="h-4 w-4" aria-hidden /> Sign out
      </Button>
    </div>
  );
}

/**
 * Authenticated app shell: fixed sidebar on desktop, slide-over menu on mobile.
 * Content area is scrollable; footer-safe (content fills height).
 */
export function AppShell({ active, children }: { active: ShellActive; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r bg-background p-4 lg:flex">
        <div>
          <button type="button" onClick={() => navigate('dashboard')} aria-label="Go to dashboard" className="mb-6 mt-1 block px-1 text-left">
            <Logo size="sm" />
          </button>
          <NavItems active={active} />
        </div>
        <UserCard />
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 lg:hidden">
        <button type="button" onClick={() => navigate('dashboard')} aria-label="Go to dashboard">
          <Logo size="sm" />
        </button>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="min-h-[44px] min-w-[44px]">
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col justify-between p-4">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div>
                <div className="mb-6 px-1">
                  <Logo size="sm" />
                </div>
                <NavItems active={active} onNavigate={() => setMenuOpen(false)} />
              </div>
              <UserCard />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Content */}
      <main className="w-full flex-1 px-4 pb-10 pt-16 sm:px-6 lg:ml-64 lg:px-8 lg:pt-8 lg:w-[calc(100%-16rem)]">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>

      {/* Desktop theme toggle floating */}
      <div className="fixed bottom-4 right-4 z-30 hidden lg:block">
        <ThemeToggle />
      </div>
    </div>
  );
}
