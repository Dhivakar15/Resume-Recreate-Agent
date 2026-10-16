'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { useAuthStore } from '@/stores/auth-store';
import { useResumesStore, type ResumeSummary } from '@/stores/resumes-store';
import { navigate } from '@/lib/client/navigation';
import { apiFetch, downloadFile } from '@/lib/client/api';
import { NewResumeDialog } from '@/components/app/new-resume-dialog';
import { ViewResumeDialog } from '@/components/app/view-resume-dialog';
import { LoadingButton } from '@/components/app/loading-button';
import type { DashboardSummary } from '@/types/ai-tools';
import { TEMPLATE_LABELS, type ResumeTemplate } from '@/types/resume';
import { Float3D, Rise3D, Tilt3D } from '@/components/app/three-d/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  Eye,
  FilePlus2,
  FileText,
  FolderOpen,
  Gauge,
  History,
  ListChecks,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  ScanSearch,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Wand2,
} from 'lucide-react';

/* ─── Midnight Glass design system (matches feat-7/feat-8 recipes) ──────────── */

const GLASS =
  'relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-xl';

const GRADIENT_CTA =
  'min-h-[44px] bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 font-semibold text-white shadow-[0_10px_36px_-10px_rgba(139,92,246,0.65)] transition-all duration-200 hover:-translate-y-0.5 hover:from-violet-500 hover:via-fuchsia-500 hover:to-cyan-400 hover:shadow-[0_16px_48px_-12px_rgba(139,92,246,0.8)]';

const GLASS_BTN =
  'min-h-[44px] border border-white/[0.1] bg-white/[0.04] text-slate-200 backdrop-blur-xl transition-all duration-200 hover:border-white/25 hover:bg-white/[0.09] hover:text-white';

const CHIP_VIOLET =
  'bg-gradient-to-br from-violet-500/25 to-violet-500/5 text-violet-300 ring-1 ring-inset ring-violet-300/20';
const CHIP_FUCHSIA =
  'bg-gradient-to-br from-fuchsia-500/25 to-fuchsia-500/5 text-fuchsia-300 ring-1 ring-inset ring-fuchsia-300/20';
const CHIP_CYAN =
  'bg-gradient-to-br from-cyan-500/25 to-cyan-500/5 text-cyan-300 ring-1 ring-inset ring-cyan-300/20';
const CHIP_AMBER =
  'bg-gradient-to-br from-amber-500/25 to-amber-500/5 text-amber-300 ring-1 ring-inset ring-amber-300/20';
const CHIP_ROSE =
  'bg-gradient-to-br from-rose-500/25 to-rose-500/5 text-rose-300 ring-1 ring-inset ring-rose-300/20';
const CHIP_SLATE =
  'bg-white/[0.05] text-slate-300 ring-1 ring-inset ring-white/10';

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

/** Top sheen line for glass panels. */
function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
    />
  );
}

/** Dependency-free deterministic SVG sparkline for the ATS score history. */
function AtsSparkline({ points }: { points: number[] }) {
  const w = 120;
  const h = 36;
  const pad = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((score, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (score - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const [lastX, lastY] = coords[coords.length - 1].split(',');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="overflow-visible">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} className="fill-cyan-300" stroke="none" />
    </svg>
  );
}

/* ─── Overview: score cards ─────────────────────────────────────────────────── */

function ScoreCard({
  icon: Icon,
  chip,
  label,
  value,
  suffix = '',
  caption,
  progress,
  barClass,
  locked = false,
  children,
}: {
  icon: ElementType;
  chip: string;
  label: string;
  value: number | null;
  suffix?: string;
  caption: ReactNode;
  progress: number | null;
  barClass: string;
  locked?: boolean;
  children?: ReactNode;
}) {
  const pct = progress == null ? 0 : Math.max(0, Math.min(100, progress));
  return (
    <div className={GLASS + ' flex h-full flex-col p-5'}>
      <Sheen />
      <div className="flex items-start justify-between gap-2">
        <span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + chip}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        {children}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-white">
        {value == null ? '—' : value}
        {value == null ? '' : suffix}
      </p>
      <div className="mt-1 min-h-[16px] text-xs text-slate-400">
        {locked ? <span className="text-slate-500">Run the Analyzer to unlock</span> : caption}
      </div>
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress ?? undefined}
      >
        <div
          className={'h-full rounded-full bg-gradient-to-r ' + barClass}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Overview: panels ──────────────────────────────────────────────────────── */

function KeywordGroup({ label, items, className }: { label: string; items: string[]; className: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((keyword, i) => (
          <span
            key={`${keyword}-${i}`}
            className={'rounded-full border px-2.5 py-0.5 text-xs font-medium ' + className}
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: DashboardSummary['latestAnalysis'] }) {
  return (
    <section className={GLASS + ' p-5 sm:p-6'}>
      <Sheen />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Latest AI Analysis</h2>
        {analysis && <span className="shrink-0 text-[11px] text-slate-500">{timeAgo(analysis.generatedAt)}</span>}
      </div>

      {analysis ? (
        <>
          <div className="mt-4 flex items-center gap-4">
            <span className="flex shrink-0 flex-col items-center rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/20 via-violet-500/10 to-transparent px-4 py-3">
              <span className="text-3xl font-semibold tabular-nums text-white">{analysis.score}</span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                ATS
              </span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white" title={analysis.resumeTitle}>
                {analysis.resumeTitle}
              </p>
              <p className="mt-1 text-xs text-slate-400">Newest scan with prioritized fixes and keyword coverage.</p>
            </div>
          </div>

          {analysis.improvements.length > 0 && (
            <ol className="mt-4 space-y-2">
              {analysis.improvements.map((item, i) => (
                <li
                  key={`${item}-${i}`}
                  className="flex items-start gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
                >
                  <span className="mt-0.5 text-[11px] font-semibold tabular-nums text-slate-500">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
                  <span className="min-w-0 text-sm text-slate-300">{item}</span>
                </li>
              ))}
            </ol>
          )}

          {(analysis.keywordMatch.matched.length > 0 || analysis.keywordMatch.missing.length > 0) && (
            <div className="mt-4 space-y-3">
              <KeywordGroup
                label="Matched keywords"
                items={analysis.keywordMatch.matched}
                className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
              />
              <KeywordGroup
                label="Missing keywords"
                items={analysis.keywordMatch.missing}
                className="border-rose-400/30 bg-rose-400/10 text-rose-200"
              />
            </div>
          )}

          <Button onClick={() => navigate('analyzer', analysis.resumeId)} className={GLASS_BTN + ' mt-5'}>
            Open Analyzer <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4 py-6 text-center">
          <Float3D duration={5}>
            <span className={'flex h-14 w-14 items-center justify-center rounded-2xl ' + CHIP_CYAN}>
              <ScanSearch className="h-7 w-7" aria-hidden />
            </span>
          </Float3D>
          <div>
            <p className="text-sm font-medium text-white">No AI analysis yet</p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Run the AI Resume Analyzer to get an estimated ATS score, prioritized fixes and keyword coverage.
            </p>
          </div>
          <Button onClick={() => navigate('analyzer')} className={GLASS_BTN}>
            Run the Analyzer <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
    </section>
  );
}

function RecommendationsPanel({ items }: { items: string[] }) {
  return (
    <section className={GLASS + ' p-5 sm:p-6'}>
      <Sheen />
      <h2 className="text-base font-semibold text-white">AI Recommendations</h2>
      <ul className="mt-3 space-y-2">
        {items.map((rec, i) => (
          <li
            key={`${rec}-${i}`}
            className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            <span className="min-w-0 text-sm leading-relaxed text-slate-300">{rec}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentResumeRow({ resume }: { resume: DashboardSummary['recentResumes'][number] }) {
  const [pdfBusy, setPdfBusy] = useState(false);

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      await downloadFile(`/api/resumes/${resume.id}/pdf`, `${resume.title}.pdf`);
      toast.success('PDF downloaded.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPdfBusy(false);
    }
  };

  const templateLabel = TEMPLATE_LABELS[resume.template as ResumeTemplate] ?? resume.template;

  return (
    <li className="group flex min-w-0 items-center gap-2 rounded-xl border border-transparent p-2 transition-colors hover:border-white/[0.07] hover:bg-white/[0.03]">
      <button
        type="button"
        onClick={() => navigate('builder', resume.id)}
        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
      >
        <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ' + CHIP_VIOLET}>
          <FileText className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white" title={resume.title}>
            {resume.title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">
            {templateLabel} · {resume.versions} version{resume.versions === 1 ? '' : 's'} · Updated{' '}
            {timeAgo(resume.updatedAt)}
          </span>
        </span>
        {resume.targetRole && (
          <span className="hidden shrink-0 rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-200 sm:inline-block">
            {resume.targetRole}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={downloadPdf}
        disabled={pdfBusy}
        aria-label={`Download PDF of ${resume.title}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
      >
        {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
      </button>
    </li>
  );
}

function RecentResumesPanel({
  resumes,
  onCreate,
}: {
  resumes: DashboardSummary['recentResumes'];
  onCreate: () => void;
}) {
  return (
    <section className={GLASS + ' p-5 sm:p-6'}>
      <Sheen />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Recent Resumes</h2>
        {resumes.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('resumes')}
            className="flex min-h-[44px] items-center gap-1 text-xs font-medium text-cyan-300 transition-colors hover:text-cyan-200"
          >
            View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>

      {resumes.length === 0 ? (
        <div className="mt-2 flex flex-col items-center gap-4 py-6 text-center">
          <Float3D duration={5}>
            <span className={'flex h-14 w-14 items-center justify-center rounded-2xl ' + CHIP_VIOLET}>
              <FileText className="h-7 w-7" aria-hidden />
            </span>
          </Float3D>
          <div>
            <p className="text-sm font-medium text-white">Create your first resume</p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Start from scratch or upload an existing resume — the AI studio takes it from there.
            </p>
          </div>
          <Button onClick={onCreate} className={GRADIENT_CTA}>
            <FilePlus2 className="h-4 w-4" aria-hidden /> Create Your First Resume
          </Button>
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {resumes.map((r) => (
            <RecentResumeRow key={r.id} resume={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

const ACTIVITY_META: Record<string, { icon: ElementType; chip: string; dot: string }> = {
  resume_created: { icon: FilePlus2, chip: CHIP_VIOLET, dot: 'bg-violet-400' },
  created: { icon: FilePlus2, chip: CHIP_VIOLET, dot: 'bg-violet-400' },
  resume_updated: { icon: Pencil, chip: CHIP_FUCHSIA, dot: 'bg-fuchsia-400' },
  updated: { icon: Pencil, chip: CHIP_FUCHSIA, dot: 'bg-fuchsia-400' },
  resume_optimized: { icon: Wand2, chip: CHIP_VIOLET, dot: 'bg-violet-400' },
  analysis: { icon: ScanSearch, chip: CHIP_CYAN, dot: 'bg-cyan-400' },
  application: { icon: BriefcaseBusiness, chip: CHIP_AMBER, dot: 'bg-amber-400' },
  cover_letter: { icon: Mail, chip: CHIP_FUCHSIA, dot: 'bg-fuchsia-400' },
  version_created: { icon: History, chip: CHIP_CYAN, dot: 'bg-cyan-400' },
  version: { icon: History, chip: CHIP_CYAN, dot: 'bg-cyan-400' },
  deleted: { icon: Trash2, chip: CHIP_ROSE, dot: 'bg-rose-400' },
};

function activityMeta(type: string) {
  return ACTIVITY_META[type] ?? { icon: Activity, chip: CHIP_SLATE, dot: 'bg-slate-400' };
}

function ActivityPanel({ activities }: { activities: DashboardSummary['activities'] }) {
  return (
    <section className={GLASS + ' p-5'}>
      <Sheen />
      <h2 className="text-base font-semibold text-white">Recent Activity</h2>
      {activities.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No activity yet — resume and application actions will appear here.
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {activities.map((a) => {
            const meta = activityMeta(a.type);
            const Icon = meta.icon;
            return (
              <li key={a.id} className="flex items-start gap-3">
                <span className={'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' + meta.chip}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-slate-300">{a.message}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span aria-hidden className={'h-1.5 w-1.5 rounded-full ' + meta.dot} />
                    {timeAgo(a.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function PipelinePanel({ stats }: { stats: DashboardSummary['stats'] }) {
  const legend = [
    { label: 'Applied', dot: 'bg-cyan-400' },
    { label: 'Shortlisted', dot: 'bg-violet-400' },
    { label: 'Interview', dot: 'bg-amber-400' },
    { label: 'Selected', dot: 'bg-emerald-400' },
    { label: 'Rejected', dot: 'bg-rose-400' },
  ];
  const cells = [
    { label: 'Active', value: stats.activeApplications },
    { label: 'Interviews', value: stats.interviewsScheduled },
    { label: 'Total', value: stats.totalApplications },
  ];
  return (
    <section className={GLASS + ' p-5'}>
      <Sheen />
      <h2 className="text-base font-semibold text-white">Application Pipeline</h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-2 py-3 text-center">
            <p className="text-2xl font-semibold tabular-nums text-white">{cell.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{cell.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
        {legend.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span aria-hidden className={'h-1.5 w-1.5 rounded-full ' + item.dot} /> {item.label}
          </span>
        ))}
      </div>
      <Button onClick={() => navigate('tracker')} className={GLASS_BTN + ' mt-4 w-full'}>
        Open Tracker <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </section>
  );
}

/* ─── Overview: loading + error states ──────────────────────────────────────── */

function SummarySkeleton() {
  return (
    <div role="status" className="mt-6 min-w-0">
      <span className="sr-only">Loading dashboard…</span>
      <div aria-hidden className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={GLASS + ' h-44 animate-pulse p-5'}>
            <div className="h-10 w-10 rounded-xl bg-white/[0.06]" />
            <div className="mt-4 h-3 w-24 rounded bg-white/[0.05]" />
            <div className="mt-2 h-8 w-20 rounded bg-white/[0.06]" />
            <div className="mt-4 h-1.5 w-full rounded-full bg-white/[0.05]" />
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={GLASS + ' h-[76px] animate-pulse p-3.5'}>
            <div className="h-9 w-9 rounded-lg bg-white/[0.06]" />
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className={GLASS + ' h-72 animate-pulse'} />
          <div className={GLASS + ' h-64 animate-pulse'} />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <div className={GLASS + ' h-64 animate-pulse'} />
          <div className={GLASS + ' h-56 animate-pulse'} />
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="relative mt-6 overflow-hidden rounded-2xl border border-rose-400/30 bg-rose-500/[0.06] p-5 backdrop-blur-xl"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-rose-300/40 to-transparent"
      />
      <div className="flex flex-wrap items-center gap-4">
        <span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + CHIP_ROSE}>
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-rose-100">Could not load your dashboard</p>
          <p className="mt-0.5 text-sm text-rose-200/80">{message}</p>
        </div>
        <Button onClick={onRetry} className={GLASS_BTN}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Retry
        </Button>
      </div>
    </div>
  );
}

/* ─── Overview: Dashboard Home ──────────────────────────────────────────────── */

function OverviewHome({ onCreate }: { onCreate: () => void }) {
  const authUser = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await apiFetch<DashboardSummary>('/api/dashboard/summary'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetches every time the overview section mounts.
  useEffect(() => {
    void load();
  }, [load]);

  const firstName = (summary?.user.name ?? authUser?.name ?? 'there').trim().split(/\s+/)[0] || 'there';
  const s = summary;

  const scoreCards = s
    ? [
        {
          key: 'ats',
          icon: Gauge,
          chip: CHIP_CYAN,
          barClass: 'from-cyan-400 to-violet-500',
          label: 'ATS Score',
          value: s.scores.ats,
          suffix: '',
          progress: s.scores.ats,
          locked: s.scores.ats == null,
          caption: (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate">
                {s.scores.atsResumeTitle ? `Best: ${s.scores.atsResumeTitle}` : 'Latest analysis'}
              </span>
              {s.scores.atsTargetRole && (
                <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                  {s.scores.atsTargetRole}
                </span>
              )}
            </span>
          ),
        },
        {
          key: 'quality',
          icon: BadgeCheck,
          chip: CHIP_VIOLET,
          barClass: 'from-violet-400 to-fuchsia-500',
          label: 'Resume Quality',
          value: s.scores.quality,
          suffix: '',
          progress: s.scores.quality,
          locked: s.scores.quality == null,
          caption: <span className="block truncate">{s.scores.qualityResumeTitle ?? 'Latest resume'}</span>,
        },
        {
          key: 'completion',
          icon: ListChecks,
          chip: CHIP_FUCHSIA,
          barClass: 'from-fuchsia-400 to-violet-500',
          label: 'Resume Completion',
          value: s.scores.completion,
          suffix: '%',
          progress: s.scores.completion,
          locked: false,
          caption: <span className="block truncate">Content readiness of your latest resume</span>,
        },
        {
          key: 'profile',
          icon: UserCheck,
          chip: CHIP_AMBER,
          barClass: 'from-fuchsia-400 to-amber-400',
          label: 'Profile Completeness',
          value: s.scores.profileCompleteness,
          suffix: '%',
          progress: s.scores.profileCompleteness,
          locked: false,
          caption: <span className="block truncate">Personal info across your resume</span>,
        },
      ]
    : [];

  const quickActions: { key: string; icon: ElementType; chip: string; label: string; hint: string; action: () => void }[] = [
    { key: 'create', icon: FilePlus2, chip: CHIP_VIOLET, label: 'Create Resume', hint: 'Start blank or from sample data', action: onCreate },
    { key: 'upload', icon: Upload, chip: CHIP_CYAN, label: 'Upload Resume', hint: 'PDF or DOCX recreated by AI', action: onCreate },
    { key: 'analyze', icon: ScanSearch, chip: CHIP_FUCHSIA, label: 'Analyze Resume', hint: 'Estimated ATS score and fixes', action: () => navigate('analyzer') },
    { key: 'improve', icon: Wand2, chip: CHIP_VIOLET, label: 'Improve Resume', hint: 'AI rewrites and polishing', action: () => navigate('rewriter') },
    { key: 'ats', icon: Gauge, chip: CHIP_CYAN, label: 'ATS Scores', hint: 'Score history and analytics', action: () => navigate('analytics') },
    { key: 'cover', icon: Mail, chip: CHIP_AMBER, label: 'Cover Letter', hint: 'Tailored AI-drafted letters', action: () => navigate('coverletter') },
  ];

  return (
    <div className="min-w-0">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
            AI CAREER COMMAND CENTER
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(167,139,250,0.35)]">
              {firstName}
            </span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-400">
            {mounted && <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>}
            {s && (
              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                Member since {new Date(s.user.memberSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
        <Button onClick={onCreate} className={GRADIENT_CTA}>
          <Plus className="h-4 w-4" aria-hidden /> Create New Resume
        </Button>
      </header>

      {/* Background refresh failed but we still have data — compact strip */}
      {error && s && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-400/30 bg-rose-500/[0.06] px-4 py-3 text-sm backdrop-blur-xl"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" aria-hidden />
          <span className="min-w-0 flex-1 text-rose-200/90">Refresh failed: {error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-[36px] rounded-lg border border-rose-300/30 bg-rose-400/10 px-3 text-xs font-medium text-rose-100 transition-colors hover:bg-rose-400/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* First load */}
      {loading && !s && <SummarySkeleton />}

      {/* Failed with nothing to show */}
      {!loading && error && !s && <ErrorPanel message={error} onRetry={() => void load()} />}

      {/* Content */}
      {s && (
        <>
          {/* Score grid */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {scoreCards.map((card, i) => (
              <Rise3D key={card.key} delay={i * 0.06} className="h-full">
                <Tilt3D className="h-full" max={3.5}>
                  <ScoreCard
                    icon={card.icon}
                    chip={card.chip}
                    label={card.label}
                    value={card.value}
                    suffix={card.suffix}
                    caption={card.caption}
                    progress={card.progress}
                    barClass={card.barClass}
                    locked={card.locked}
                  >
                    {card.key === 'ats' && s.scores.atsHistory.length >= 2 && (
                      <span className="shrink-0 text-cyan-300/90">
                        <AtsSparkline points={s.scores.atsHistory.map((h) => h.score)} />
                      </span>
                    )}
                  </ScoreCard>
                </Tilt3D>
              </Rise3D>
            ))}
          </div>

          {/* Quick actions */}
          <h2 className="sr-only">Quick actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Rise3D key={action.key} delay={0.1 + i * 0.04} className="h-full">
                  <Tilt3D className="h-full" max={3.5}>
                    <button
                      type="button"
                      onClick={action.action}
                      className="flex min-h-[44px] h-full w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/25 hover:bg-white/[0.05]"
                    >
                      <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ' + action.chip}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-white">{action.label}</span>
                        <span className="block truncate text-[11px] text-slate-400">{action.hint}</span>
                      </span>
                    </button>
                  </Tilt3D>
                </Rise3D>
              );
            })}
          </div>

          {/* Main + side columns */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="min-w-0 space-y-4 lg:col-span-3">
              <AnalysisPanel analysis={s.latestAnalysis} />
              {s.recommendations.length > 0 && <RecommendationsPanel items={s.recommendations} />}
              <RecentResumesPanel resumes={s.recentResumes} onCreate={onCreate} />
            </div>
            <div className="min-w-0 space-y-4 lg:col-span-2">
              <ActivityPanel activities={s.activities} />
              <PipelinePanel stats={s.stats} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Resumes section ───────────────────────────────────────────────────────── */

function ResumeCard({
  resume,
  onView,
  onDelete,
}: {
  resume: ResumeSummary;
  onView: (r: ResumeSummary) => void;
  onDelete: (r: ResumeSummary) => void;
}) {
  const duplicate = useResumesStore((s) => s.duplicate);
  const rename = useResumesStore((s) => s.rename);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(resume.title);
  const [renaming, setRenaming] = useState(false);
  const [latexBusy, setLatexBusy] = useState(false);

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      await downloadFile(`/api/resumes/${resume.id}/pdf`, `${resume.title}.pdf`);
      toast.success('PDF downloaded.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPdfBusy(false);
    }
  };

  const downloadLatex = async () => {
    setLatexBusy(true);
    try {
      await downloadFile(`/api/resumes/${resume.id}/latex`, `${resume.title}.tex`);
      toast.success('LaTeX file downloaded.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLatexBusy(false);
    }
  };

  return (
    <Tilt3D className="h-full" max={3}>
      <div
        className={
          GLASS +
          ' flex h-full min-w-0 flex-col p-5 transition-all duration-300 hover:border-violet-300/25 hover:bg-white/[0.05]'
        }
      >
        <Sheen />
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-white" title={resume.title}>
              {resume.title}
            </h3>
            <p className="mt-1 text-xs text-slate-400">Updated {timeAgo(resume.updatedAt)}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px] shrink-0 text-slate-300 hover:bg-white/[0.06] hover:text-white"
                aria-label={`Actions for ${resume.title}`}
              >
                <MoreVertical className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('builder', resume.id)}>
                <Pencil className="h-4 w-4" aria-hidden /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onView(resume)}>
                <Eye className="h-4 w-4" aria-hidden /> View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await duplicate(resume.id);
                    toast.success('Resume duplicated.');
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <Copy className="h-4 w-4" aria-hidden /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setRenameValue(resume.title);
                  setRenameOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={downloadPdf} disabled={pdfBusy}>
                <Download className="h-4 w-4" aria-hidden /> {pdfBusy ? 'Creating PDF…' : 'Download PDF'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadLatex} disabled={latexBusy}>
                <Code2 className="h-4 w-4" aria-hidden /> {latexBusy ? 'Generating…' : 'Generate LaTeX'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(resume)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" aria-hidden /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          {resume.targetRole ? (
            <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-200">
              {resume.targetRole}
            </span>
          ) : (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-slate-500">
              No target role
            </span>
          )}
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-slate-300">
            {TEMPLATE_LABELS[resume.template] ?? resume.template}
          </span>
          <span className="text-[11px] text-slate-500">
            {resume._count?.versions ?? 0} version{(resume._count?.versions ?? 0) === 1 ? '' : 's'}
          </span>
          <div className="ml-auto flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="min-h-[36px] border-white/[0.1] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white"
              onClick={() => onView(resume)}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden /> View
            </Button>
            <Button
              size="sm"
              className="min-h-[36px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
              onClick={() => navigate('builder', resume.id)}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
            </Button>
          </div>
        </div>

        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Rename resume</DialogTitle>
              <DialogDescription>Give this resume a descriptive name.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="rename-input">Resume name</Label>
              <Input
                id="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={80}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renameValue.trim()) {
                    setRenaming(true);
                    rename(resume.id, renameValue.trim())
                      .then(() => {
                        toast.success('Renamed.');
                        setRenameOpen(false);
                      })
                      .catch((err: Error) => toast.error(err.message))
                      .finally(() => setRenaming(false));
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <LoadingButton
                loading={renaming}
                loadingText="Renaming…"
                disabled={!renameValue.trim()}
                onClick={() => {
                  setRenaming(true);
                  rename(resume.id, renameValue.trim())
                    .then(() => {
                      toast.success('Renamed.');
                      setRenameOpen(false);
                    })
                    .catch((err: Error) => toast.error(err.message))
                    .finally(() => setRenaming(false));
                }}
              >
                Save name
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Tilt3D>
  );
}

function EmptyResumes({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-6 backdrop-blur-xl">
      <Sheen />
      <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
        <Float3D duration={5}>
          <span className={'flex h-14 w-14 items-center justify-center rounded-2xl ' + CHIP_VIOLET}>
            <FolderOpen className="h-7 w-7" aria-hidden />
          </span>
        </Float3D>
        <div>
          <p className="font-semibold text-white">You haven&apos;t created a resume yet.</p>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            Start from scratch, upload an existing resume to recreate it with AI, or explore with sample data.
          </p>
        </div>
        <Button onClick={onCreate} className={GRADIENT_CTA}>
          <Sparkles className="h-4 w-4" aria-hidden /> Create Your First Resume
        </Button>
      </div>
    </div>
  );
}

function ResumesSection({
  onCreate,
  onView,
  onDelete,
}: {
  onCreate: () => void;
  onView: (r: ResumeSummary) => void;
  onDelete: (r: ResumeSummary) => void;
}) {
  const resumes = useResumesStore((s) => s.resumes);
  const loading = useResumesStore((s) => s.loading);
  const loaded = useResumesStore((s) => s.loaded);

  // Fetch (forcing a refresh if the store was already loaded) once per section mount.
  useEffect(() => {
    void useResumesStore.getState().fetch(!useResumesStore.getState().loaded);
  }, []);

  return (
    <div className="min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">RESUME WORKSPACE</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">My Resumes</h1>
          <p className="mt-2 text-sm text-slate-400">All of your resumes, in one place.</p>
        </div>
        <Button onClick={onCreate} className={GRADIENT_CTA}>
          <Plus className="h-4 w-4" aria-hidden /> Create New Resume
        </Button>
      </header>

      <div className="mt-6">
        {loading && !loaded ? (
          <>
            <p className="sr-only" role="status">
              Loading resumes…
            </p>
            <div aria-hidden className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className={GLASS + ' h-44 animate-pulse'} />
              ))}
            </div>
          </>
        ) : resumes.length === 0 ? (
          <EmptyResumes onCreate={onCreate} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((r, i) => (
              <Rise3D key={r.id} delay={Math.min(i, 8) * 0.04} className="h-full">
                <ResumeCard resume={r} onView={onView} onDelete={onDelete} />
              </Rise3D>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── View ──────────────────────────────────────────────────────────────────── */

export function DashboardView({ section }: { section: 'overview' | 'resumes' }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResumeSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await useResumesStore.getState().remove(deleteTarget.id);
      toast.success('Resume deleted.');
      setDeleteTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell active={section === 'resumes' ? 'resumes' : 'overview'}>
      {section === 'overview' ? (
        <OverviewHome onCreate={() => setCreateOpen(true)} />
      ) : (
        <ResumesSection
          onCreate={() => setCreateOpen(true)}
          onView={(res) => setViewTarget(res.id)}
          onDelete={setDeleteTarget}
        />
      )}

      <NewResumeDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ViewResumeDialog
        resumeId={viewTarget}
        open={!!viewTarget}
        onOpenChange={(o) => !o && setViewTarget(null)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this resume along with its saved versions and analyses. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
            >
              {deleting ? 'Deleting…' : 'Delete resume'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
