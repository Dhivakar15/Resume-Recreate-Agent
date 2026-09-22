'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { Logo } from '@/components/app/logo';
import { apiFetch } from '@/lib/client/api';
import { Rise3D } from '@/components/app/three-d/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AppUser } from '@/stores/auth-store';
import type { AppNotification, DashboardSummary } from '@/types/ai-tools';
import {
  Bell,
  BriefcaseBusiness,
  CheckCheck,
  FileText,
  History,
  KeyRound,
  MailOpen,
  RefreshCw,
  ScanSearch,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Constants & helpers ─────────────────────────────────────────────────────

const GLASS = 'border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';

const LAST_EMAIL_KEY = 'rra_last_email';

const NOTIF_DOT: Record<string, string> = {
  application_reminder: 'bg-amber-400',
  missing_info: 'bg-fuchsia-400',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const fmtLongDate = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

/** Inline load-error block with retry, shared by every section. */
function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-sm text-red-300">{message}</p>
      <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" aria-hidden /> Retry
      </Button>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  delay,
  action,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Rise3D delay={delay} className={className}>
      <Card className={cn('h-full', GLASS)}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {title}
              </CardTitle>
              <CardDescription className="mt-1 text-slate-500">{description}</CardDescription>
            </div>
            {action}
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </Rise3D>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function SettingsView() {
  // Account (GET /api/auth/me)
  const [meUser, setMeUser] = useState<AppUser | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [meError, setMeError] = useState<string | null>(null);

  // Usage (GET /api/dashboard/summary — single call)
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sumLoading, setSumLoading] = useState(true);
  const [sumError, setSumError] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  // Remembered sign-in email (localStorage, read client-side only)
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    setMeLoading(true);
    setMeError(null);
    try {
      const data = await apiFetch<{ user: AppUser | null }>('/api/auth/me');
      setMeUser(data.user);
    } catch (e) {
      setMeError((e as Error).message);
    } finally {
      setMeLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSumLoading(true);
    setSumError(null);
    try {
      const data = await apiFetch<DashboardSummary>('/api/dashboard/summary');
      setSummary(data);
    } catch (e) {
      setSumError((e as Error).message);
    } finally {
      setSumLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    setNotifError(null);
    try {
      const data = await apiFetch<{ notifications: AppNotification[]; unread: number }>('/api/notifications');
      setNotifications(data.notifications);
      setUnread(data.unread);
    } catch (e) {
      setNotifError((e as Error).message);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
    loadSummary();
    loadNotifications();
    try {
      setRememberedEmail(window.localStorage.getItem(LAST_EMAIL_KEY));
    } catch {
      /* storage unavailable */
    }
  }, [loadMe, loadSummary, loadNotifications]);

  const markAllRead = async () => {
    setMarking(true);
    try {
      await apiFetch('/api/notifications', { method: 'PATCH', json: { all: true } });
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
      setUnread(0);
      toast.success('All notifications marked as read.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setMarking(false);
    }
  };

  const forgetEmail = () => {
    try {
      window.localStorage.removeItem(LAST_EMAIL_KEY);
    } catch {
      /* storage unavailable */
    }
    setRememberedEmail(null);
    toast.success('Remembered email forgotten.');
  };

  const usage = [
    { label: 'Resumes', value: summary?.stats.totalResumes ?? 0, icon: FileText, tone: 'text-violet-300' },
    { label: 'Versions', value: summary?.stats.totalVersions ?? 0, icon: History, tone: 'text-fuchsia-300' },
    { label: 'AI Analyses', value: summary?.stats.totalAnalyses ?? 0, icon: ScanSearch, tone: 'text-cyan-300' },
    { label: 'Applications', value: summary?.stats.totalApplications ?? 0, icon: BriefcaseBusiness, tone: 'text-blue-300' },
    { label: 'Cover Letters', value: summary?.stats.totalCoverLetters ?? 0, icon: MailOpen, tone: 'text-purple-300' },
  ];

  const memberSince = fmtLongDate(summary?.user.memberSince ?? meUser?.createdAt);

  return (
    <AppShell active="settings">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your account, notifications and workspace preferences.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Account */}
        <SectionCard icon={Sparkles} title="Account" description="Your profile details." delay={0}>
          {meLoading ? (
            <div className="h-24 animate-pulse rounded-xl bg-white/[0.04]" />
          ) : meError ? (
            <LoadError message={meError} onRetry={loadMe} />
          ) : meUser ? (
            <div className="flex flex-wrap items-center gap-4">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-400 text-xl font-semibold text-white shadow-lg shadow-violet-600/30"
                aria-hidden
              >
                {meUser.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-100">{meUser.name}</p>
                <p className="truncate text-sm text-slate-400">{meUser.email}</p>
                <p className="mt-1 text-xs text-slate-500">{memberSince ? `Member since ${memberSince}` : 'Member since —'}</p>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">You are not signed in.</p>
          )}
        </SectionCard>

        {/* Usage */}
        <SectionCard icon={ScanSearch} title="Usage" description="Everything you have created so far." delay={0.05}>
          {sumLoading ? (
            <div className="h-24 animate-pulse rounded-xl bg-white/[0.04]" />
          ) : sumError ? (
            <LoadError message={sumError} onRetry={loadSummary} />
          ) : summary ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {usage.map((u) => (
                <div key={u.label} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <u.icon className={cn('h-4 w-4 shrink-0', u.tone)} aria-hidden />
                    <p className="text-lg font-bold leading-none text-white">{u.value}</p>
                  </div>
                  <p className="mt-1.5 truncate text-xs text-slate-500">{u.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          icon={Bell}
          title="Notifications"
          description="Recent reminders and alerts."
          delay={0.1}
          className="lg:col-span-2"
          action={
            <Button
              variant="outline"
              size="sm"
              disabled={marking || (unread === 0 && !notifLoading)}
              onClick={markAllRead}
              className="min-h-[36px] border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
            >
              <CheckCheck className="h-4 w-4" aria-hidden /> Mark all read
            </Button>
          }
        >
          {notifLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-white/[0.04]" />
          ) : notifError ? (
            <LoadError message={notifError} onRetry={loadNotifications} />
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'border-white/10 text-xs font-semibold',
                    unread > 0 ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-200' : 'text-slate-400',
                  )}
                >
                  {unread} unread
                </Badge>
                <span className="text-xs text-slate-500">{notifications.length} total</span>
              </div>
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">You&apos;re all caught up — no notifications yet.</p>
              ) : (
                <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
                        n.read ? 'opacity-60' : 'border border-white/[0.05] bg-white/[0.03]',
                      )}
                    >
                      <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', NOTIF_DOT[n.type] ?? 'bg-cyan-400')} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-slate-200">{n.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.body}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-slate-600">{timeAgo(n.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* Preferences — only when a remembered email exists */}
        {rememberedEmail && (
          <SectionCard icon={KeyRound} title="Preferences" description="Sign-in conveniences stored on this device." delay={0.15}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-slate-500">Remembered sign-in email</p>
                <p className="mt-1 truncate text-sm font-medium text-slate-200">{rememberedEmail}</p>
                <p className="mt-1 text-xs text-slate-500">Pre-fills the sign-in form on this device.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={forgetEmail}
                className="min-h-[36px] border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
              >
                Forget remembered email
              </Button>
            </div>
          </SectionCard>
        )}

        {/* About */}
        <SectionCard
          icon={Sparkles}
          title="About"
          description="Platform information."
          delay={0.2}
          className={cn(rememberedEmail ? '' : 'lg:col-span-2')}
        >
          <div className="flex flex-col gap-3">
            <Logo size="sm" light />
            <div>
              <p className="font-semibold text-slate-100">Resume Recreate Agent AI</p>
              <p className="mt-1 text-sm text-slate-400">
                Your AI career studio — build, analyze and track resumes that land interviews.
              </p>
              <p className="mt-2 text-xs text-slate-500">AI Resume &amp; Career Assistant Platform</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
