'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Logo } from '@/components/app/logo';
import { useAuthStore } from '@/stores/auth-store';
import { navigate, type ViewName } from '@/lib/client/navigation';
import { apiFetch } from '@/lib/client/api';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Bell,
  LogOut,
  Menu,
  LayoutDashboard,
  Files,
  FilePlus2,
  ScanSearch,
  Wand2,
  LayoutTemplate,
  History,
  BriefcaseBusiness,
  MailOpen,
  Target,
  Compass,
  Blocks,
  Linkedin,
  MessagesSquare,
  Mic,
  KanbanSquare,
  BarChart3,
  Settings,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiAssistant } from '@/components/app/assistant/ai-assistant';
import type { AppNotification } from '@/types/ai-tools';

// ─── Navigation model ────────────────────────────────────────────────────────

export type ShellActive =
  | 'overview' | 'resumes' | 'builder' | 'analyzer' | 'rewriter' | 'templates' | 'versions'
  | 'jobmatch' | 'coverletter' | 'skillgap' | 'career' | 'projectgen' | 'linkedin'
  | 'interview' | 'mockinterview' | 'tracker' | 'analytics' | 'settings';

interface NavItem {
  key: ShellActive;
  label: string;
  icon: React.ElementType;
  view: ViewName;
}

const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  { label: null, items: [{ key: 'overview', label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' }] },
  {
    label: 'Resume',
    items: [
      { key: 'resumes', label: 'My Resumes', icon: Files, view: 'resumes' },
      { key: 'builder', label: 'Resume Builder', icon: FilePlus2, view: 'dashboard' },
      { key: 'analyzer', label: 'Resume Analyzer', icon: ScanSearch, view: 'analyzer' },
      { key: 'rewriter', label: 'Resume Rewriter', icon: Wand2, view: 'rewriter' },
      { key: 'templates', label: 'Templates', icon: LayoutTemplate, view: 'templates' },
      { key: 'versions', label: 'Resume Versions', icon: History, view: 'versions' },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { key: 'jobmatch', label: 'Job Matcher', icon: BriefcaseBusiness, view: 'jobmatch' },
      { key: 'coverletter', label: 'Cover Letter Generator', icon: MailOpen, view: 'coverletter' },
      { key: 'skillgap', label: 'Skill Gap Analyzer', icon: Target, view: 'skillgap' },
      { key: 'career', label: 'Career Advisor', icon: Compass, view: 'career' },
      { key: 'projectgen', label: 'Project Description', icon: Blocks, view: 'projectgen' },
      { key: 'linkedin', label: 'LinkedIn Optimizer', icon: Linkedin, view: 'linkedin' },
    ],
  },
  {
    label: 'Career',
    items: [
      { key: 'interview', label: 'Interview Preparation', icon: MessagesSquare, view: 'interview' },
      { key: 'mockinterview', label: 'Mock Interview', icon: Mic, view: 'mockinterview' },
      { key: 'tracker', label: 'Application Tracker', icon: KanbanSquare, view: 'tracker' },
    ],
  },
  { label: 'Analytics', items: [{ key: 'analytics', label: 'Resume Analytics', icon: BarChart3, view: 'analytics' }] },
];

// The builder needs a resume id — route to My Resumes where the user picks one.
function itemTarget(item: NavItem): ViewName {
  return item.view;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function NavButton({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => {
        navigate(itemTarget(item));
        onNavigate?.();
      }}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200',
        active
          ? 'translate-x-0.5 border border-violet-400/20 bg-gradient-to-r from-violet-600/25 to-fuchsia-600/15 text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.55)]'
          : 'border border-transparent text-slate-400 hover:translate-x-0.5 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-100',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0 transition-colors', active ? 'text-violet-300' : 'text-slate-500 group-hover:text-violet-300')} aria-hidden />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function NavItems({ active, onNavigate }: { active: ShellActive; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation" className="space-y-4">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.label ?? `group-${gi}`}>
          {group.label && (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group.label}</p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavButton key={item.key} item={item} active={active === item.key} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SettingsButton({ active, onNavigate }: { active: boolean; onNavigate?: () => void }) {
  return (
    <NavButton
      item={{ key: 'settings', label: 'Settings', icon: Settings, view: 'settings' }}
      active={active}
      onNavigate={onNavigate}
    />
  );
}

function UserCard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-400 text-sm font-semibold text-white shadow-lg shadow-violet-600/30"
          aria-hidden
        >
          {(user?.name ?? 'U').slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-100">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        className="mt-2 min-h-[40px] w-full justify-start gap-2 text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
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

function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ notifications: AppNotification[]; unread: number }>('/api/notifications');
      setNotifications(data.notifications);
      setUnread(data.unread);
    } catch {
      /* bell is non-critical — silently keep previous state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch('/api/notifications', { method: 'PATCH', json: { all: true } });
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  return { notifications, unread, open, setOpen, load, markAllRead, loading };
}

function NotificationList({
  notifications,
  loading,
  onMarkAllRead,
}: {
  notifications: AppNotification[];
  loading: boolean;
  onMarkAllRead: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0e1f]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Notifications</p>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="flex min-h-[32px] items-center gap-1 text-xs text-slate-400 transition-colors hover:text-cyan-300"
        >
          <CheckCheck className="h-3.5 w-3.5" aria-hidden /> Mark all read
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto p-1.5 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
        {loading && notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-slate-500">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-slate-500">You&apos;re all caught up.</p>
        ) : (
          notifications.slice(0, 12).map((n) => (
            <div
              key={n.id}
              className={cn(
                'rounded-lg px-3 py-2.5 transition-colors',
                n.read ? 'opacity-60' : 'bg-white/[0.03]',
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                    n.type === 'application_reminder' ? 'bg-amber-400' : n.type === 'missing_info' ? 'bg-fuchsia-400' : 'bg-cyan-400',
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-200">{n.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.body}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NotificationsBell({ variant }: { variant: 'sidebar' | 'mobile' }) {
  const { notifications, unread, markAllRead, loading } = useNotifications();
  const [popoverOpen, setPopoverOpen] = useState(false);

  if (variant === 'mobile') {
    return (
      <Sheet open={popoverOpen} onOpenChange={setPopoverOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative min-h-[44px] min-w-[44px] text-slate-300 hover:bg-white/[0.06] hover:text-white">
            <Bell className="h-5 w-5" aria-hidden />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1 text-[9px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="top" className="border-white/[0.08] bg-[#0a0e1f] p-3">
          <SheetTitle className="sr-only">Notifications</SheetTitle>
          <NotificationList notifications={notifications} loading={loading} onMarkAllRead={markAllRead} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative min-h-[40px] min-w-[40px] text-slate-400 hover:bg-white/[0.06] hover:text-white"
        onClick={() => setPopoverOpen((o) => !o)}
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>
      {popoverOpen && (
        <>
          <button type="button" aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setPopoverOpen(false)} />
          <div className="absolute left-0 top-0 z-50 w-80 max-w-[calc(100vw-2rem)] translate-y-[calc(100%+10px)]">
            <NotificationList notifications={notifications} loading={loading} onMarkAllRead={markAllRead} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Shell ───────────────────────────────────────────────────────────────────

/**
 * Authenticated app shell — always-dark "Midnight Glass" chrome.
 * Fixed glass sidebar on desktop, slide-over menu on mobile.
 * Mounts the global AI assistant widget.
 */
export function AppShell({ active, children }: { active: ShellActive; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="dark min-h-screen bg-[#04050d] text-slate-200">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-violet-600/[0.09] blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-cyan-500/[0.06] blur-[110px]" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-fuchsia-600/[0.05] blur-[110px]" />
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.06] bg-[#070b18]/80 backdrop-blur-2xl lg:flex">
        <div className="flex items-center justify-between px-4 pb-2 pt-5">
          <button type="button" onClick={() => navigate('dashboard')} aria-label="Go to dashboard" className="block px-1 text-left">
            <Logo size="sm" light />
          </button>
          <NotificationsBell variant="sidebar" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]">
          <NavItems active={active} />
        </div>
        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-2">
            <SettingsButton active={active === 'settings'} />
          </div>
          <UserCard />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#070b18]/90 px-4 backdrop-blur-2xl lg:hidden">
        <button type="button" onClick={() => navigate('dashboard')} aria-label="Go to dashboard">
          <Logo size="sm" light />
        </button>
        <div className="flex items-center gap-1">
          <NotificationsBell variant="mobile" />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="min-h-[44px] min-w-[44px] text-slate-300 hover:bg-white/[0.06] hover:text-white">
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-80 flex-col border-white/[0.08] bg-[#070b18] p-4">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="mb-4 px-1">
                <Logo size="sm" light />
              </div>
              <div className="flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]">
                <NavItems active={active} onNavigate={() => setMenuOpen(false)} />
                <div className="mt-4">
                  <SettingsButton active={active === 'settings'} onNavigate={() => setMenuOpen(false)} />
                </div>
              </div>
              <div className="pt-3">
                <UserCard />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 w-full px-4 pb-16 pt-16 sm:px-6 lg:ml-64 lg:w-[calc(100%-16rem)] lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {/* Global AI assistant */}
      <AiAssistant />
    </div>
  );
}
