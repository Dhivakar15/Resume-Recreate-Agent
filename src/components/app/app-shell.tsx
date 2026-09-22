'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Logo } from '@/components/app/logo';
import { AiAssistant } from '@/components/app/assistant/ai-assistant';
import { useAuthStore } from '@/stores/auth-store';
import { navigate, type ViewName } from '@/lib/client/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  ClipboardList,
  Compass,
  FilePlus2,
  History,
  LayoutDashboard,
  LayoutTemplate,
  Linkedin,
  LogOut,
  Mail,
  Menu,
  MessagesSquare,
  Mic,
  ScanSearch,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Union of every shell-aware view. Each feature view mounts
 * `<AppShell active="...">` with one of these literals.
 */
export type ShellActive =
  | 'overview'
  | 'resumes'
  | 'builder'
  | 'analyzer'
  | 'rewriter'
  | 'templates'
  | 'versions'
  | 'jobmatch'
  | 'coverletter'
  | 'skillgap'
  | 'career'
  | 'projectgen'
  | 'linkedin'
  | 'interview'
  | 'mockinterview'
  | 'tracker'
  | 'analytics'
  | 'settings';

interface NavItem {
  key: ShellActive;
  label: string;
  icon: React.ElementType;
  view: ViewName;
  /** Optional deep-link id appended to the hash (e.g. analytics#skills). */
  id?: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ key: 'overview', label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' }],
  },
  {
    label: 'Resume',
    items: [
      { key: 'builder', label: 'Builder', icon: FilePlus2, view: 'builder' },
      { key: 'analyzer', label: 'Analyzer', icon: ScanSearch, view: 'analyzer' },
      { key: 'rewriter', label: 'Rewriter', icon: Wand2, view: 'rewriter' },
      { key: 'templates', label: 'Templates', icon: LayoutTemplate, view: 'templates' },
      { key: 'versions', label: 'Versions', icon: History, view: 'versions' },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { key: 'jobmatch', label: 'Job Matcher', icon: BriefcaseBusiness, view: 'jobmatch' },
      { key: 'coverletter', label: 'Cover Letter', icon: Mail, view: 'coverletter' },
      { key: 'skillgap', label: 'Skill Gap', icon: Target, view: 'skillgap' },
      { key: 'career', label: 'Career Advisor', icon: Compass, view: 'career' },
      { key: 'projectgen', label: 'Project Description', icon: Boxes, view: 'projectgen' },
      { key: 'linkedin', label: 'LinkedIn Optimizer', icon: Linkedin, view: 'linkedin' },
    ],
  },
  {
    label: 'Career',
    items: [
      { key: 'interview', label: 'Interview Prep', icon: MessagesSquare, view: 'interview' },
      { key: 'mockinterview', label: 'Mock Interview', icon: Mic, view: 'mockinterview' },
      { key: 'tracker', label: 'Applications', icon: ClipboardList, view: 'tracker' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { key: 'analytics', label: 'Resume Analytics', icon: BarChart3, view: 'analytics' },
      // Deep link: #/analytics/skills scrolls to the skills-progress section.
      { key: 'analytics', label: 'Skill Progress', icon: TrendingUp, view: 'analytics', id: 'skills' },
    ],
  },
];

const SETTINGS_ITEM: NavItem = { key: 'settings', label: 'Settings', icon: Settings, view: 'settings' };

/** Start index of each group within the flattened nav (for active matching). */
const GROUP_STARTS: number[] = (() => {
  const starts: number[] = [];
  let acc = 0;
  for (const group of NAV_GROUPS) {
    starts.push(acc);
    acc += group.items.length;
  }
  return starts;
})();

const NAV_SCROLL_CLASSES =
  'min-h-0 flex-1 overflow-y-auto [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10';

/** Broadcast a global event the floating AiAssistant listens for. */
function openAssistant() {
  window.dispatchEvent(new CustomEvent('rra:assistant:open'));
}

function NavButton({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => {
        navigate(item.view, item.id);
        onNavigate?.();
      }}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-white/[0.06] text-white'
          : 'text-slate-400 hover:translate-x-1 hover:bg-white/[0.04] hover:text-white',
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-violet-400 to-cyan-400"
        />
      )}
      <Icon
        className={cn('h-4 w-4 shrink-0', active ? 'text-violet-300' : 'text-slate-500')}
        aria-hidden
      />
      {item.label}
    </button>
  );
}

function NavGroups({ active, onNavigate }: { active: ShellActive; onNavigate?: () => void }) {
  // Only the first item matching the active view highlights, so the
  // "Skill Progress" deep link never double-highlights "Resume Analytics".
  const activeIndex = NAV_GROUPS.flatMap((group) => group.items).findIndex(
    (item) => item.key === active,
  );

  return (
    <nav aria-label="Main navigation" className="space-y-0.5">
      {NAV_GROUPS.map((group, groupIndex) => {
        const start = GROUP_STARTS[groupIndex];
        return (
          <div key={group.label ?? 'core'}>
            {group.label && (
              <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item, itemIndex) => (
                <NavButton
                  key={item.label}
                  item={item}
                  active={start + itemIndex === activeIndex}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function AssistantMenuItem({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        onNavigate?.();
        openAssistant();
      }}
      className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:translate-x-1 hover:bg-white/[0.04] hover:text-white"
    >
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-600/50 to-cyan-500/40 ring-1 ring-inset ring-white/15"
      >
        <Sparkles className="h-3.5 w-3.5 text-violet-200" />
      </span>
      AI Assistant
    </button>
  );
}

function UserCard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const initials =
    (user?.name ?? 'U')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase() || 'U';

  return (
    <div className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-semibold text-white shadow-md shadow-violet-900/40"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-200">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        className="mt-2 min-h-[40px] w-full justify-start gap-2 text-slate-400 hover:text-white"
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

function SidebarBottom({ active, onNavigate }: { active: ShellActive; onNavigate?: () => void }) {
  return (
    <div className="space-y-0.5 border-t border-white/[0.06] px-3 pb-4 pt-3">
      <AssistantMenuItem onNavigate={onNavigate} />
      <NavButton item={SETTINGS_ITEM} active={active === 'settings'} onNavigate={onNavigate} />
      <UserCard />
    </div>
  );
}

/**
 * Authenticated app shell — "Midnight Glass" command center (always dark,
 * matching the landing/auth experience). Fixed glass sidebar on desktop with
 * grouped navigation, slide-over sheet on mobile, aurora backdrop, and the
 * floating AI assistant mounted once globally.
 */
export function AppShell({ active, children }: { active: ShellActive; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen bg-[#04050d] text-slate-200">
      {/* Decorative aurora + grid backdrop (always dark, purely ornamental) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_0%,black_25%,transparent_78%)]" />
        <div className="absolute -top-40 left-1/4 h-96 w-[36rem] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute right-[-8rem] top-1/3 h-80 w-80 rounded-full bg-fuchsia-600/[0.08] blur-[110px]" />
        <div className="absolute bottom-[-6rem] left-[-4rem] h-72 w-72 rounded-full bg-cyan-500/[0.07] blur-[110px]" />
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.06] bg-white/[0.02] backdrop-blur-xl lg:flex">
        <div className="px-4 pb-2 pt-5">
          <button
            type="button"
            onClick={() => navigate('dashboard')}
            aria-label="Go to dashboard"
            className="block px-1 text-left"
          >
            <Logo size="sm" light />
          </button>
        </div>
        <div className={NAV_SCROLL_CLASSES}>
          <NavGroups active={active} />
        </div>
        <SidebarBottom active={active} />
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#04050d]/80 px-4 backdrop-blur-xl lg:hidden">
        <button type="button" onClick={() => navigate('dashboard')} aria-label="Go to dashboard">
          <Logo size="sm" light />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openAssistant}
            aria-label="Open AI assistant"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Sparkles className="h-5 w-5" aria-hidden />
          </button>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className="min-h-[44px] min-w-[44px] text-slate-300 hover:text-white"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex w-72 flex-col border-white/[0.08] bg-[#0a0e1f] p-4 text-slate-200"
            >
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="px-1 pb-2 pt-1">
                <Logo size="sm" light />
              </div>
              <div className={NAV_SCROLL_CLASSES}>
                <NavGroups active={active} onNavigate={() => setMenuOpen(false)} />
              </div>
              <SidebarBottom active={active} onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 w-full flex-1 px-4 pb-10 pt-16 sm:px-6 lg:ml-64 lg:w-[calc(100%-16rem)] lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {/* Global floating AI assistant (single mount, self-positioned bottom-right) */}
      <AiAssistant />
    </div>
  );
}
