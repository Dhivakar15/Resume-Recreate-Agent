'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { LoadingButton } from '@/components/app/loading-button';
import { Float3D, Rise3D, Tilt3D } from '@/components/app/three-d/motion';
import { apiFetch } from '@/lib/client/api';
import { navigate } from '@/lib/client/navigation';
import { useResumesStore, type ResumeSummary } from '@/stores/resumes-store';
import { type SkillGapResult, type SkillPriority } from '@/types/ai-tools';
import { TARGET_ROLES } from '@/types/resume';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  GraduationCap,
  RefreshCw,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Midnight Glass recipes ──────────────────────────────────────────────────

const GLASS = 'border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';
const INPUT_CLS = 'border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600 dark:bg-white/[0.04]';
const OUTLINE_BTN = 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white min-h-[44px]';
const PRIMARY_BTN =
  'min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500';

const PRIORITY_BADGE: Record<SkillPriority, string> = {
  high: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  medium: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  low: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
};

const CHIP: Record<'current' | 'missing' | 'learning', string> = {
  current: 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  missing: 'border border-rose-400/20 bg-rose-400/10 text-rose-300',
  learning: 'border border-violet-400/25 bg-violet-500/15 text-violet-300',
};

/** Gradient readiness ring (violet → fuchsia → cyan) with the % centred. */
function ReadinessRing({ value, label }: { value: number; label: string }) {
  const size = 160;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label}: ${pct} out of 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#skillgap-ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          className="transition-[stroke-dasharray] duration-700"
        />
        <defs>
          <linearGradient id="skillgap-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="55%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center [transform:translateZ(24px)]">
        <span className="text-4xl font-bold tabular-nums text-white">{pct}</span>
        <span className="text-xs text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

function Chip({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', className)}>
      {label}
    </span>
  );
}

function FlowPanel({
  title,
  icon,
  chipClass,
  items,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  chipClass: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {icon} {title}
      </p>
      <div className="mt-2.5 max-h-44 space-y-0 overflow-y-auto pr-0.5 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
        {items.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {items.map((s, i) => (
              <Chip key={`${s}-${i}`} label={s} className={chipClass} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex shrink-0 items-center justify-center self-center" aria-hidden>
      <ArrowRight className="h-5 w-5 rotate-90 text-slate-600 md:rotate-0" />
    </div>
  );
}

/** AI Skill Gap Analyzer: compare your resume against a target role or job description. */
export function SkillGapView() {
  const resumes = useResumesStore((s) => s.resumes);
  const resumesLoaded = useResumesStore((s) => s.loaded);
  const loadingResumes = useResumesStore((s) => s.loading);
  const fetchResumes = useResumesStore((s) => s.fetch);

  const [resumeId, setResumeId] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [roleError, setRoleError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SkillGapResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    fetchResumes(!useResumesStore.getState().loaded).catch((e: unknown) => toast.error((e as Error).message));
  }, [fetchResumes]);

  const noResumes = resumesLoaded && resumes.length === 0;
  const selectedResume = resumes.find((r) => r.id === resumeId) ?? null;

  const onResumeChange = (id: string) => {
    setResumeId(id);
    const resume: ResumeSummary | undefined = resumes.find((r) => r.id === id);
    if (resume?.targetRole) setTargetRole(resume.targetRole);
  };

  const runAnalysis = async () => {
    if (analyzing || !selectedResume) return;
    const rErr = !targetRole.trim() ? 'Target role is required.' : null;
    setRoleError(rErr);
    if (rErr) return;
    setAnalyzing(true);
    setRunError(null);
    try {
      const data = await apiFetch<SkillGapResult>('/api/ai/skill-gap', {
        method: 'POST',
        json: {
          resumeId: selectedResume.id,
          targetRole: targetRole.trim(),
          jobDescription: jobDescription.trim() || undefined,
        },
      });
      setResult(data);
      toast.success('Skill gap analysis complete — review your results below.');
    } catch (e) {
      setRunError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <AppShell active="skillgap">
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30"
            aria-hidden
          >
            <Target className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">AI Skill Gap Analyzer</h1>
            <p className="text-sm text-slate-400">
              See how your current skills stack up against a target role, and get a plan to close the gap.
            </p>
          </div>
        </header>

        {noResumes ? (
          /* Empty state: no resumes yet */
          <Card className={cn(GLASS, 'border-dashed')}>
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <Float3D duration={5}>
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15 text-violet-300"
                  aria-hidden
                >
                  <FilePlus2 className="h-7 w-7" />
                </span>
              </Float3D>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">You haven&apos;t created a resume yet.</h2>
                <p className="mx-auto max-w-sm text-sm text-slate-400">
                  The analyzer reads your resume to find your current skills. Create one first, then run your first gap
                  analysis.
                </p>
              </div>
              <Button className={PRIMARY_BTN} onClick={() => navigate('resumes')}>
                <FilePlus2 className="h-4 w-4" aria-hidden /> Create Your First Resume
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Setup card */}
            <Rise3D>
              <Card className={GLASS}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Target className="h-4 w-4 text-violet-300" aria-hidden /> Analysis setup
                  </CardTitle>
                  <CardDescription className="text-slate-500">
                    Choose a resume and the role you&apos;re aiming for.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="skillgap-resume" className="text-slate-300">
                      Resume
                    </Label>
                    <Select value={resumeId || undefined} onValueChange={onResumeChange} disabled={analyzing || loadingResumes}>
                      <SelectTrigger
                        id="skillgap-resume"
                        className="min-h-[44px] w-full border-white/10 text-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"
                      >
                        <SelectValue placeholder={loadingResumes ? 'Loading resumes…' : 'Choose a resume'} />
                      </SelectTrigger>
                      <SelectContent className="border-white/[0.08] bg-[#0a0e1f] text-slate-200">
                        {resumes.map((r) => (
                          <SelectItem key={r.id} value={r.id} className="focus:bg-white/[0.06] focus:text-white">
                            {r.title}
                            {r.targetRole ? ` — ${r.targetRole}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="skillgap-role" className="text-slate-300">
                      Target role
                    </Label>
                    <Input
                      id="skillgap-role"
                      list="skillgap-target-roles"
                      placeholder="e.g. Frontend Developer"
                      value={targetRole}
                      maxLength={80}
                      disabled={analyzing}
                      aria-invalid={roleError ? true : undefined}
                      className={INPUT_CLS}
                      onChange={(e) => {
                        setTargetRole(e.target.value);
                        if (roleError && e.target.value.trim()) setRoleError(null);
                      }}
                    />
                    <datalist id="skillgap-target-roles">
                      {TARGET_ROLES.map((role) => (
                        <option key={role} value={role} />
                      ))}
                    </datalist>
                    {roleError && <p className="text-xs text-rose-400">{roleError}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="skillgap-jd" className="text-slate-300">
                      Job description <span className="text-slate-500">(optional)</span>
                    </Label>
                    <Textarea
                      id="skillgap-jd"
                      rows={5}
                      maxLength={15000}
                      placeholder="Paste a job description to compare against (optional — otherwise AI uses the target role)"
                      value={jobDescription}
                      disabled={analyzing}
                      className={cn(INPUT_CLS, 'min-h-[110px] resize-y')}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <LoadingButton
                      loading={analyzing}
                      loadingText="Analyzing skill gap…"
                      disabled={!selectedResume}
                      onClick={runAnalysis}
                      className={cn(PRIMARY_BTN, 'w-full sm:w-auto')}
                    >
                      <Sparkles className="h-4 w-4" aria-hidden /> Analyze skill gap
                    </LoadingButton>
                  </div>
                  {!selectedResume && <p className="text-xs text-slate-500">Choose a resume to enable analysis.</p>}
                </CardContent>
              </Card>
            </Rise3D>

            {analyzing ? (
              /* Loading skeleton */
              <div className="space-y-6" aria-live="polite" aria-busy="true">
                <Card className={GLASS}>
                  <CardContent className="flex flex-col items-center gap-6 py-8 sm:flex-row">
                    <Skeleton className="h-40 w-40 shrink-0 rounded-full bg-white/[0.06]" />
                    <div className="w-full space-y-3">
                      <Skeleton className="h-5 w-2/3 bg-white/[0.06]" />
                      <Skeleton className="h-3 w-full bg-white/[0.06]" />
                      <Skeleton className="h-3 w-5/6 bg-white/[0.06]" />
                      <Skeleton className="h-3 w-3/5 bg-white/[0.06]" />
                    </div>
                  </CardContent>
                </Card>
                <Card className={GLASS}>
                  <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-36 w-full bg-white/[0.06]" />
                    ))}
                  </CardContent>
                </Card>
                <Card className={GLASS}>
                  <CardContent className="space-y-3 py-6">
                    <Skeleton className="h-4 w-1/2 bg-white/[0.06]" />
                    <Skeleton className="h-2 w-full bg-white/[0.06]" />
                  </CardContent>
                </Card>
              </div>
            ) : runError ? (
              /* Inline error + retry */
              <Card className={cn(GLASS, 'border-rose-400/20')}>
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-400/10 text-rose-300" aria-hidden>
                    <AlertTriangle className="h-6 w-6" />
                  </span>
                  <p className="max-w-md text-sm text-rose-300">{runError}</p>
                  <Button variant="outline" className={OUTLINE_BTN} onClick={runAnalysis}>
                    <RefreshCw className="h-4 w-4" aria-hidden /> Retry analysis
                  </Button>
                </CardContent>
              </Card>
            ) : result ? (
              /* ── Results ── */
              <div className="space-y-6" aria-live="polite">
                {/* a) Hero: readiness ring */}
                <Rise3D distance={20} tilt={6}>
                  <Tilt3D max={3}>
                    <Card className={GLASS}>
                      <CardContent className="flex flex-col items-center gap-6 py-8 sm:flex-row sm:gap-8">
                        <ReadinessRing value={result.readiness} label={`Job readiness for ${result.targetRole}`} />
                        <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                          <h2 className="text-lg font-semibold text-white">Job Readiness for {result.targetRole}</h2>
                          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                            <Badge variant="outline" className="border-violet-400/30 bg-violet-500/10 text-violet-200">
                              <Target className="h-3 w-3" aria-hidden /> {result.targetRole}
                            </Badge>
                            <Badge variant="outline" className="border-white/15 text-slate-400">
                              {new Date(result.generatedAt).toLocaleString()}
                            </Badge>
                          </div>
                          <p className="text-sm leading-relaxed text-slate-400">{result.summary}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Tilt3D>
                </Rise3D>

                {/* b) Current → Missing → Learning flow strip */}
                <Rise3D delay={0.06}>
                  <Card className={GLASS}>
                    <CardHeader>
                      <CardTitle className="text-base text-white">Current → Missing → Learning</CardTitle>
                      <CardDescription className="text-slate-500">
                        Where you stand, what&apos;s absent, and what to learn first.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-stretch gap-3 md:flex-row">
                        <FlowPanel
                          title="Current Skills"
                          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />}
                          chipClass={CHIP.current}
                          items={result.currentSkills}
                          emptyText="No skills detected on the resume yet."
                        />
                        <FlowArrow />
                        <FlowPanel
                          title="Missing Skills"
                          icon={<XCircle className="h-3.5 w-3.5 text-rose-400" aria-hidden />}
                          chipClass={CHIP.missing}
                          items={result.missingSkills}
                          emptyText="Nothing missing — great alignment."
                        />
                        <FlowArrow />
                        <FlowPanel
                          title="Recommended Learning"
                          icon={<GraduationCap className="h-3.5 w-3.5 text-violet-300" aria-hidden />}
                          chipClass={CHIP.learning}
                          items={result.recommendations.map((rec) => rec.skill)}
                          emptyText="No learning priorities needed right now."
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Rise3D>

                {/* c) Matched vs missing stats */}
                <Rise3D delay={0.1}>
                  <Card className={GLASS}>
                    <CardContent className="space-y-3 py-6">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-slate-200">
                          <span className="tabular-nums text-emerald-400">{result.matchedSkills.length}</span>
                          <span className="text-slate-500">/{result.requiredSkills.length}</span> required skills matched
                        </p>
                        <span className="text-sm tabular-nums text-slate-500">{result.readiness}% ready</span>
                      </div>
                      <Progress
                        value={result.requiredSkills.length > 0 ? (result.matchedSkills.length / result.requiredSkills.length) * 100 : 0}
                        className="h-2 bg-white/[0.06] [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-cyan-400"
                        aria-label={`${result.matchedSkills.length} of ${result.requiredSkills.length} required skills matched`}
                      />
                      <p className="text-xs text-slate-500">
                        Matched skills come straight from your resume; the missing ones fuel the learning plan below.
                      </p>
                    </CardContent>
                  </Card>
                </Rise3D>

                {/* d) Recommendations */}
                <div className="space-y-3">
                  <Rise3D delay={0.14}>
                    <h2 className="text-base font-semibold text-white">Closing the gap</h2>
                  </Rise3D>
                  {result.recommendations.length > 0 ? (
                    result.recommendations.map((rec, i) => (
                      <Rise3D key={`${rec.skill}-${i}`} delay={0.16 + i * 0.05}>
                        <Card className={GLASS}>
                          <CardContent className="space-y-3 py-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                                <GraduationCap className="h-4 w-4 text-violet-300" aria-hidden /> {rec.skill}
                              </h3>
                              <Badge variant="outline" className={cn('bg-transparent capitalize', PRIORITY_BADGE[rec.priority] ?? 'border-white/15 text-slate-300')}>
                                {rec.priority} priority
                              </Badge>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-400">{rec.reason}</p>
                            {rec.learningSteps.length > 0 && (
                              <ol className="space-y-2">
                                {rec.learningSteps.map((step, j) => (
                                  <li key={j} className="flex items-start gap-2.5 text-sm text-slate-300">
                                    <span
                                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-300"
                                      aria-hidden
                                    >
                                      {j + 1}
                                    </span>
                                    <span className="text-pretty">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </CardContent>
                        </Card>
                      </Rise3D>
                    ))
                  ) : (
                    <Rise3D delay={0.16}>
                      <Card className={cn(GLASS, 'border-dashed')}>
                        <CardContent className="py-8 text-center text-sm text-slate-400">
                          No learning recommendations — your skills already cover this role.
                        </CardContent>
                      </Card>
                    </Rise3D>
                  )}
                </div>
              </div>
            ) : (
              /* Empty state before first run */
              <Card className={cn(GLASS, 'border-dashed')}>
                <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                  <Float3D duration={5} wobble={3}>
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] text-slate-400" aria-hidden>
                      <Target className="h-7 w-7" />
                    </span>
                  </Float3D>
                  <p className="max-w-md text-sm text-slate-400">
                    Pick a resume and a target role (or paste a job description), then run the analysis. You&apos;ll get a
                    readiness score, matched vs missing skills and a step-by-step learning plan.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
