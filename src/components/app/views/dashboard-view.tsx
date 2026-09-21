'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { useAuthStore } from '@/stores/auth-store';
import { useResumesStore, type ResumeSummary } from '@/stores/resumes-store';
import { navigate } from '@/lib/client/navigation';
import { apiFetch, downloadFile } from '@/lib/client/api';
import { NewResumeDialog } from '@/components/app/new-resume-dialog';
import { ViewResumeDialog } from '@/components/app/view-resume-dialog';
import { LoadingButton } from '@/components/app/loading-button';
import { Float3D, Rise3D, Tilt3D } from '@/components/app/three-d/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
import { TEMPLATE_LABELS, type ResumeTemplate } from '@/types/resume';
import type { DashboardSummary } from '@/types/ai-tools';
import {
  Plus,
  MoreVertical,
  Pencil,
  Eye,
  Copy,
  Trash2,
  Download,
  Code2,
  Files,
  ScanSearch,
  Sparkles,
  History,
  FileText,
  FolderOpen,
  FilePlus2,
  Upload,
  Wand2,
  Gauge,
  MailOpen,
  Activity as ActivityIcon,
  BriefcaseBusiness,
  Lightbulb,
  RefreshCw,
  ArrowRight,
  Target,
  UserRound,
  ListChecks,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// ─── Score ring ──────────────────────────────────────────────────────────────

function ScoreRing({ value, size = 84, label }: { value: number; size?: number; label?: string }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={label ?? `${pct} out of 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          className="transition-[stroke-dasharray] duration-700"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="55%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-lg font-bold text-white">{pct}</span>
    </div>
  );
}

// ─── Glass panel recipe ──────────────────────────────────────────────────────

const GLASS = 'border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';

function ScoreCard({
  title,
  value,
  hint,
  icon: Icon,
  delay,
  children,
}: {
  title: string;
  value: number | null;
  hint: string;
  icon: React.ElementType;
  delay: number;
  children?: React.ReactNode;
}) {
  return (
    <Rise3D delay={delay} className="h-full">
      <Tilt3D className="h-full" max={4}>
        <Card className={cn('h-full', GLASS)} style={{ transformStyle: 'preserve-3d' }}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
                {value == null ? (
                  <p className="mt-2 text-sm text-slate-500">No data yet</p>
                ) : (
                  <p className="mt-1.5 text-3xl font-bold leading-none text-white">
                    {value}
                    <span className="ml-0.5 text-sm font-medium text-slate-500">/100</span>
                  </p>
                )}
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{hint}</p>
                {children}
              </div>
              {value != null && <ScoreRing value={value} label={`${title}: ${value} of 100`} />}
              {value == null && (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Tilt3D>
    </Rise3D>
  );
}

function QuickAction({
  icon: Icon,
  title,
  subtitle,
  onClick,
  tone,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
  tone: 'violet' | 'fuchsia' | 'cyan' | 'blue' | 'purple' | 'amber';
  delay: number;
}) {
  const tones: Record<string, string> = {
    violet: 'from-violet-600 to-violet-500 shadow-violet-600/40',
    fuchsia: 'from-fuchsia-600 to-fuchsia-500 shadow-fuchsia-600/40',
    cyan: 'from-cyan-600 to-cyan-500 shadow-cyan-600/40',
    blue: 'from-blue-600 to-blue-500 shadow-blue-600/40',
    purple: 'from-purple-600 to-purple-500 shadow-purple-600/40',
    amber: 'from-amber-600 to-amber-500 shadow-amber-600/40',
  };
  return (
    <Rise3D delay={delay} className="h-full">
      <Tilt3D max={3.5} className="h-full">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'group flex h-full min-h-[44px] w-full items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 text-left backdrop-blur-xl transition-all duration-200',
            'hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.05] hover:shadow-[0_10px_40px_-12px_rgba(139,92,246,0.35)]',
          )}
        >
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110',
              tones[tone],
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-slate-100">{title}</span>
            <span className="block truncate text-sm text-slate-500">{subtitle}</span>
          </span>
        </button>
      </Tilt3D>
    </Rise3D>
  );
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  resume_created: FilePlus2,
  analysis: Gauge,
  job_match: Target,
  cover_letter: MailOpen,
  application: BriefcaseBusiness,
  version_saved: History,
  resume_optimized: Wand2,
};

// ─── Resume card (kept from existing feature) ────────────────────────────────

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
      <Card className={cn('flex h-full min-w-0 flex-col transition-shadow hover:shadow-[0_10px_40px_-12px_rgba(139,92,246,0.35)]', GLASS)}>
        <CardHeader className="pb-3">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="truncate text-base text-slate-100" title={resume.title}>
                {resume.title}
              </CardTitle>
              <CardDescription className="mt-1 text-slate-500">Updated {timeAgo(resume.updatedAt)}</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="min-h-[40px] min-w-[40px] shrink-0 text-slate-400 hover:bg-white/[0.06] hover:text-white" aria-label={`Actions for ${resume.title}`}>
                  <MoreVertical className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-white/[0.08] bg-[#0a0e1f] text-slate-200">
                <DropdownMenuItem onClick={() => navigate('builder', resume.id)} className="focus:bg-white/[0.06] focus:text-white">
                  <Pencil className="h-4 w-4" aria-hidden /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onView(resume)} className="focus:bg-white/[0.06] focus:text-white">
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
                  className="focus:bg-white/[0.06] focus:text-white"
                >
                  <Copy className="h-4 w-4" aria-hidden /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRenameValue(resume.title);
                    setRenameOpen(true);
                  }}
                  className="focus:bg-white/[0.06] focus:text-white"
                >
                  <Pencil className="h-4 w-4" aria-hidden /> Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[0.08]" />
                <DropdownMenuItem onClick={downloadPdf} disabled={pdfBusy} className="focus:bg-white/[0.06] focus:text-white">
                  <Download className="h-4 w-4" aria-hidden /> {pdfBusy ? 'Creating PDF…' : 'Download PDF'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadLatex} disabled={latexBusy} className="focus:bg-white/[0.06] focus:text-white">
                  <Code2 className="h-4 w-4" aria-hidden /> {latexBusy ? 'Generating…' : 'Generate LaTeX'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[0.08]" />
                <DropdownMenuItem onClick={() => onDelete(resume)} className="text-red-400 focus:bg-white/[0.06] focus:text-red-300">
                  <Trash2 className="h-4 w-4" aria-hidden /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="mt-auto flex flex-wrap items-center gap-2">
          {resume.targetRole ? (
            <Badge variant="secondary" className="border-transparent bg-violet-500/15 text-violet-200">
              {resume.targetRole}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-white/10 text-slate-400">
              No target role
            </Badge>
          )}
          <Badge variant="outline" className="border-white/10 text-slate-400">
            {TEMPLATE_LABELS[resume.template] ?? resume.template}
          </Badge>
          <span className="text-xs text-slate-500">
            {resume._count?.versions ?? 0} version{(resume._count?.versions ?? 0) === 1 ? '' : 's'}
          </span>
          <div className="ml-auto flex gap-1.5">
            <Button size="sm" variant="outline" className="min-h-[36px] border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white" onClick={() => onView(resume)}>
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
        </CardContent>

        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent className="border-white/[0.08] bg-[#0a0e1f] sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Rename resume</DialogTitle>
              <DialogDescription className="text-slate-500">Give this resume a descriptive name.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="rename-input" className="text-slate-300">
                Resume name
              </Label>
              <Input
                id="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={80}
                className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600"
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
              <Button variant="outline" className="border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white" onClick={() => setRenameOpen(false)}>
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
      </Card>
    </Tilt3D>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function DashboardView({ section }: { section: 'overview' | 'resumes' }) {
  const user = useAuthStore((s) => s.user);
  const { resumes, loading, loaded, fetch } = useResumesStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResumeSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await apiFetch<DashboardSummary>('/api/dashboard/summary');
      setSummary(data);
    } catch (e) {
      setSummaryError((e as Error).message);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(!loaded);
    loadSummary();
  }, []);

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await useResumesStore.getState().remove(deleteTarget.id);
      toast.success('Resume deleted.');
      setDeleteTarget(null);
      loadSummary();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const active = section === 'resumes' ? 'resumes' : 'overview';

  return (
    <AppShell active={active}>
      {/* Welcome */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back, {user?.name?.split(' ')[0] ?? 'there'} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {section === 'overview'
              ? 'Your AI career studio — create, improve and track resumes that get interviews.'
              : 'All of your resumes, in one place.'}
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_24px_-6px_rgba(139,92,246,0.6)] hover:from-violet-500 hover:to-fuchsia-500"
        >
          <Plus className="h-4 w-4" aria-hidden /> Create New Resume
        </Button>
      </div>

      {section === 'overview' && (
        <>
          {/* Score cards */}
          {summaryLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Card key={i} className={cn('h-40 animate-pulse', GLASS)} />
              ))}
            </div>
          ) : summaryError ? (
            <Card className={cn(GLASS, 'border-red-400/20')}>
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-red-300">{summaryError}</p>
                <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]" onClick={loadSummary}>
                  <RefreshCw className="h-4 w-4" aria-hidden /> Retry
                </Button>
              </CardContent>
            </Card>
          ) : summary ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ScoreCard
                title="ATS Score"
                value={summary.scores.ats}
                hint={
                  summary.scores.ats != null
                    ? `AI Estimated ATS Score — ${summary.scores.atsResumeTitle ?? 'latest resume'}${summary.scores.atsTargetRole ? ` · ${summary.scores.atsTargetRole}` : ''}`
                    : 'Run the AI Resume Analyzer to get your score.'
                }
                icon={Gauge}
                delay={0}
              >
                {summary.scores.atsHistory.length > 1 && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                    {(() => {
                      const h = summary.scores.atsHistory;
                      const delta = h[h.length - 1].score - h[0].score;
                      const Trend = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
                      return (
                        <>
                          <Trend className={cn('h-3.5 w-3.5', delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-slate-500')} aria-hidden />
                          {delta > 0 ? `+${delta}` : delta || '0'} pts over {h.length} runs
                        </>
                      );
                    })()}
                  </p>
                )}
              </ScoreCard>
              <ScoreCard
                title="Resume Quality"
                value={summary.scores.quality}
                hint={summary.scores.quality != null ? `Composite quality of "${summary.scores.qualityResumeTitle}"` : 'Create a resume to see quality.'}
                icon={Sparkles}
                delay={0.06}
              />
              <ScoreCard
                title="Completion"
                value={summary.scores.completion}
                hint="How complete your latest resume content is."
                icon={ListChecks}
                delay={0.12}
              >
                <Progress value={summary.scores.completion} className="mt-3 h-1.5 bg-white/[0.06] [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-cyan-400" aria-label="Resume completion" />
              </ScoreCard>
              <ScoreCard
                title="Profile"
                value={summary.scores.profileCompleteness}
                hint="Personal info completeness across your resume."
                icon={UserRound}
                delay={0.18}
              >
                <Progress value={summary.scores.profileCompleteness} className="mt-3 h-1.5 bg-white/[0.06] [&>div]:bg-gradient-to-r [&>div]:from-fuchsia-500 [&>div]:to-violet-400" aria-label="Profile completeness" />
              </ScoreCard>
            </div>
          ) : null}

          {/* Quick actions */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <QuickAction icon={FilePlus2} title="Create Resume" subtitle="Start from scratch with the AI Builder" tone="violet" delay={0.1} onClick={() => setCreateOpen(true)} />
            <QuickAction icon={Upload} title="Upload Resume" subtitle="Recreate an existing PDF/DOCX with AI" tone="blue" delay={0.14} onClick={() => setCreateOpen(true)} />
            <QuickAction icon={ScanSearch} title="Analyze Resume" subtitle="Get your AI Estimated ATS Score" tone="cyan" delay={0.18} onClick={() => navigate('analyzer')} />
            <QuickAction icon={Wand2} title="Improve Resume" subtitle="AI rewrites for any section" tone="fuchsia" delay={0.22} onClick={() => navigate('rewriter')} />
            <QuickAction icon={Gauge} title="Check ATS Score" subtitle="Keyword coverage + fixes" tone="purple" delay={0.26} onClick={() => navigate('analyzer')} />
            <QuickAction icon={MailOpen} title="Generate Cover Letter" subtitle="Tailored to any job in seconds" tone="amber" delay={0.3} onClick={() => navigate('coverletter')} />
          </div>

          {/* Recommendations + suggestions */}
          {summary && (summary.recommendations.length > 0 || summary.latestAnalysis) && (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {summary.recommendations.length > 0 && (
                <Rise3D delay={0.1}>
                  <Card className={cn(GLASS, 'h-full')}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
                          <Lightbulb className="h-4 w-4" aria-hidden />
                        </span>
                        AI Recommendations
                      </CardTitle>
                      <CardDescription className="text-slate-500">Personalized from your latest resume data.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      {summary.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-300" aria-hidden>
                            {i + 1}
                          </span>
                          <p className="text-sm leading-relaxed text-slate-300">{rec}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </Rise3D>
              )}
              {summary.latestAnalysis && (
                <Rise3D delay={0.14}>
                  <Card className={cn(GLASS, 'h-full')}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-600 to-blue-600 text-white">
                          <Target className="h-4 w-4" aria-hidden />
                        </span>
                        Improvement Suggestions
                      </CardTitle>
                      <CardDescription className="text-slate-500">
                        Latest analysis · {summary.latestAnalysis.resumeTitle} · score {summary.latestAnalysis.score}/100
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {summary.latestAnalysis.improvements.slice(0, 4).map((imp, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
                          <span className="leading-relaxed">{imp}</span>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 min-h-[36px] border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                        onClick={() => navigate('analyzer')}
                      >
                        Re-run analysis <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </CardContent>
                  </Card>
                </Rise3D>
              )}
            </div>
          )}

          {/* Recent activity */}
          {summary && summary.activities.length > 0 && (
            <Rise3D delay={0.18} className="mt-6">
              <Card className={GLASS}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-violet-600 text-white">
                      <ActivityIcon className="h-4 w-4" aria-hidden />
                    </span>
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="relative space-y-4 border-l border-white/[0.08] pl-5">
                    {summary.activities.slice(0, 6).map((a) => {
                      const AIcon = ACTIVITY_ICONS[a.type] ?? FileText;
                      return (
                        <li key={a.id} className="relative">
                          <span className="absolute -left-[27px] flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-[#0a0e1f]" aria-hidden>
                            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" />
                          </span>
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <AIcon className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                            <p className="text-sm text-slate-300">{a.message}</p>
                            <span className="text-xs text-slate-600">{timeAgo(a.createdAt)}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            </Rise3D>
          )}

          {/* Recent resumes */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent resumes</h2>
              {resumes.length > 4 && (
                <Button variant="ghost" size="sm" className="min-h-[36px] text-slate-400 hover:bg-white/[0.06] hover:text-white" onClick={() => navigate('resumes')}>
                  View all <Files className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
            {loading && !loaded ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <Card key={i} className={cn('h-40 animate-pulse', GLASS)} />
                ))}
              </div>
            ) : resumes.length === 0 ? (
              <EmptyResumes onCreate={() => setCreateOpen(true)} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {resumes.slice(0, 4).map((r, i) => (
                  <Rise3D key={r.id} delay={i * 0.05} className="h-full">
                    <ResumeCard resume={r} onView={(res) => setViewTarget(res.id)} onDelete={setDeleteTarget} />
                  </Rise3D>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {section === 'resumes' && (
        <div className="mt-2">
          {loading && !loaded ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className={cn('h-40 animate-pulse', GLASS)} />
              ))}
            </div>
          ) : resumes.length === 0 ? (
            <EmptyResumes onCreate={() => setCreateOpen(true)} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resumes.map((r, i) => (
                <Rise3D key={r.id} delay={Math.min(i, 8) * 0.04} className="h-full">
                  <ResumeCard resume={r} onView={(res) => setViewTarget(res.id)} onDelete={setDeleteTarget} />
                </Rise3D>
              ))}
            </div>
          )}
        </div>
      )}

      <NewResumeDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ViewResumeDialog resumeId={viewTarget} open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-white/[0.08] bg-[#0a0e1f]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete “{deleteTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This permanently deletes this resume along with its saved versions and analyses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
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

function EmptyResumes({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className={cn('border-dashed border-white/[0.12]', GLASS)}>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
        <Float3D duration={5}>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300 shadow-[0_0_30px_-8px_rgba(139,92,246,0.6)]">
            <FolderOpen className="h-7 w-7" aria-hidden />
          </span>
        </Float3D>
        <div>
          <p className="font-semibold text-slate-100">You haven&apos;t created a resume yet.</p>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            Start from scratch, upload an existing resume to recreate it with AI, or explore with sample data.
          </p>
        </div>
        <Button
          onClick={onCreate}
          className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
        >
          <Sparkles className="h-4 w-4" aria-hidden /> Create Your First Resume
        </Button>
      </CardContent>
    </Card>
  );
}
