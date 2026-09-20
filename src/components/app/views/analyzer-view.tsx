'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { LoadingButton } from '@/components/app/loading-button';
import { apiFetch } from '@/lib/client/api';
import { navigate } from '@/lib/client/navigation';
import { useResumesStore, type ResumeSummary } from '@/stores/resumes-store';
import { TARGET_ROLES, type ATSAnalysis } from '@/types/resume';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ScanSearch,
  Info,
  Check,
  X,
  CheckCircle2,
  TrendingUp,
  LayoutTemplate,
  Target,
  FileText,
  FilePlus2,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ATS_DISCLAIMER = 'This is an AI-generated estimate for guidance only — not an official score from a real ATS system.';

/** Color tone for a 0-100 score: emerald ≥ 80, amber ≥ 60, rose below. */
function scoreTone(score: number): { ring: string; text: string } {
  if (score >= 80) return { ring: 'stroke-emerald-600', text: 'text-emerald-700 dark:text-emerald-400' };
  if (score >= 60) return { ring: 'stroke-amber-500', text: 'text-amber-700 dark:text-amber-400' };
  return { ring: 'stroke-rose-500', text: 'text-rose-700 dark:text-rose-400' };
}

/** Donut/ring showing a 0-100 score with the number centred. */
function ScoreRing({ score, caption }: { score: number; caption: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tone = scoreTone(clamped);
  return (
    <div className="relative h-40 w-40 shrink-0 sm:h-44 sm:w-44">
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`${caption}: ${clamped} out of 100`}
      >
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className={cn('transition-[stroke-dashoffset] duration-700', tone.ring)}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-4xl font-bold tabular-nums sm:text-5xl', tone.text)}>{clamped}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function KeywordChip({ label, matched }: { label: string; matched: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        matched
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
      )}
    >
      {matched ? <Check className="h-3 w-3" aria-hidden /> : <X className="h-3 w-3" aria-hidden />}
      {label}
    </span>
  );
}

/** AI Resume Analyzer: pick a resume + target role, get an estimated ATS score and feedback. */
export function AnalyzerView({ preselectedId }: { preselectedId?: string }) {
  const resumes = useResumesStore((s) => s.resumes);
  const resumesLoaded = useResumesStore((s) => s.loaded);
  const loadingResumes = useResumesStore((s) => s.loading);
  const fetchResumes = useResumesStore((s) => s.fetch);

  const [selectedId, setSelectedId] = useState('');
  const [targetRole, setTargetRole] = useState('Software Developer');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const bootedRef = useRef(false);

  // Load resumes once; preselect the requested resume (and its target role) when it exists.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const applyPreselection = (list: ResumeSummary[]) => {
      if (!preselectedId) return;
      const found = list.find((r) => r.id === preselectedId);
      if (found) {
        setSelectedId(found.id);
        if (found.targetRole) setTargetRole(found.targetRole);
      }
    };
    if (useResumesStore.getState().loaded) {
      applyPreselection(useResumesStore.getState().resumes);
      return;
    }
    fetchResumes(true)
      .then(() => applyPreselection(useResumesStore.getState().resumes))
      .catch((e: unknown) => {
        setFetchFailed(true);
        toast.error((e as Error).message);
      });
  }, [fetchResumes, preselectedId]);

  const selectedResume = resumes.find((r) => r.id === selectedId) ?? null;
  const noResumes = (resumesLoaded && resumes.length === 0) || fetchFailed;

  const onResumeChange = (id: string) => {
    setSelectedId(id);
    const resume = resumes.find((r) => r.id === id);
    if (resume?.targetRole) setTargetRole(resume.targetRole);
  };

  const runAnalysis = async () => {
    if (!selectedResume || analyzing) return;
    setAnalyzing(true);
    try {
      const { analysis: result } = await apiFetch<{ analysis: ATSAnalysis }>('/api/ai/analyze', {
        method: 'POST',
        json: { resumeId: selectedResume.id, targetRole: targetRole.trim() || undefined },
      });
      setAnalysis(result);
      toast.success('Analysis complete — review your results below.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <AppShell active="analyzer">
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
            aria-hidden
          >
            <ScanSearch className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">AI Resume Analyzer</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Analyze your resume against a target job role and get an AI Estimated ATS Score with actionable feedback.
            </p>
          </div>
        </header>

        <Separator />

        {noResumes ? (
          /* Empty state: no resumes yet */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600/10 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
                aria-hidden
              >
                <FilePlus2 className="h-7 w-7" />
              </span>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">You haven&apos;t created a resume yet.</h2>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Create a resume first, then come back here to analyze it against your target job role.
                </p>
              </div>
              <Button className="min-h-[44px]" onClick={() => navigate('dashboard')}>
                <FilePlus2 className="h-4 w-4" aria-hidden /> Create Your First Resume
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Setup card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecks className="h-4 w-4 text-teal-600 dark:text-teal-400" aria-hidden /> Analysis setup
                </CardTitle>
                <CardDescription>Choose which resume to analyze and the role you are targeting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="analyzer-resume" className="text-sm font-medium">
                      Resume
                    </label>
                    <Select
                      value={selectedId || undefined}
                      onValueChange={onResumeChange}
                      disabled={analyzing || loadingResumes}
                    >
                      <SelectTrigger id="analyzer-resume" className="min-h-[44px] w-full">
                        <SelectValue placeholder={loadingResumes ? 'Loading resumes…' : 'Choose a resume'} />
                      </SelectTrigger>
                      <SelectContent>
                        {resumes.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="analyzer-role" className="text-sm font-medium">
                      Target job role
                    </label>
                    <Select value={targetRole} onValueChange={setTargetRole} disabled={analyzing}>
                      <SelectTrigger id="analyzer-role" className="min-h-[44px] w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <LoadingButton
                    loading={analyzing}
                    loadingText="Analyzing your resume…"
                    disabled={!selectedResume}
                    onClick={runAnalysis}
                    className="min-h-[44px] w-full sm:w-auto"
                  >
                    <ScanSearch className="h-4 w-4" aria-hidden /> Analyze Resume
                  </LoadingButton>
                </div>
              </CardContent>
            </Card>

            {analysis ? (
              /* ── Results ── */
              <div className="space-y-6" aria-live="polite">
                {/* 1. Score hero */}
                <Card className="overflow-hidden border-teal-600/20">
                  <CardContent className="flex flex-col items-center gap-6 py-6 sm:flex-row sm:gap-8">
                    <ScoreRing score={analysis.score} caption="AI Estimated ATS Score" />
                    <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                      <div className="flex items-center justify-center gap-1.5 sm:justify-start">
                        <h2 className="text-lg font-semibold">AI Estimated ATS Score</h2>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="About this score"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <Info className="h-4 w-4" aria-hidden />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-64">
                            <p>{ATS_DISCLAIMER}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <Badge className="bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:text-teal-950 dark:hover:bg-teal-400">
                          <Target className="h-3 w-3" aria-hidden /> Target role: {analysis.targetRole}
                        </Badge>
                        <Badge variant="outline">{new Date(analysis.generatedAt).toLocaleString()}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground sm:hidden">{ATS_DISCLAIMER}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Score breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Score breakdown</CardTitle>
                    <CardDescription>How each area of your resume contributes to the estimated score.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {analysis.breakdown.map((item) => (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {item.score}/{item.max}
                          </span>
                        </div>
                        <Progress
                          value={item.max > 0 ? (item.score / item.max) * 100 : 0}
                          className="h-2"
                          aria-label={`${item.label}: ${item.score} out of ${item.max}`}
                        />
                        <p className="text-xs text-muted-foreground">{item.note}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 3. Keyword match */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Keyword match</CardTitle>
                    <CardDescription>
                      Keywords the AI expected for a {analysis.targetRole} role, compared with your resume.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        <Check className="h-4 w-4" aria-hidden /> Matched keywords
                      </h3>
                      {analysis.keywordMatch.matched.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.keywordMatch.matched.map((kw) => (
                            <KeywordChip key={kw} label={kw} matched />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No matched keywords were identified.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-rose-700 dark:text-rose-400">
                        <X className="h-4 w-4" aria-hidden /> Missing keywords
                      </h3>
                      {analysis.keywordMatch.missing.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.keywordMatch.missing.map((kw) => (
                            <KeywordChip key={kw} label={kw} matched={false} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Great — no important keywords are missing.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Suggestion cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SuggestionListCard
                    title="Strengths"
                    icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
                    iconClass="text-emerald-600 dark:text-emerald-400"
                    items={analysis.strengths}
                    emptyText="No specific strengths were identified yet."
                  />
                  <SuggestionListCard
                    title="Improvement Suggestions"
                    icon={<TrendingUp className="h-4 w-4" aria-hidden />}
                    iconClass="text-amber-600 dark:text-amber-400"
                    items={analysis.improvements}
                    emptyText="No improvements suggested — nice work."
                  />
                  <SuggestionListCard
                    title="Formatting Suggestions"
                    icon={<LayoutTemplate className="h-4 w-4" aria-hidden />}
                    iconClass="text-teal-600 dark:text-teal-400"
                    items={analysis.formatting}
                    emptyText="No formatting changes suggested."
                  />
                  <SuggestionListCard
                    title="Job-specific Recommendations"
                    icon={<Target className="h-4 w-4" aria-hidden />}
                    iconClass="text-violet-600 dark:text-violet-400"
                    items={analysis.recommendations}
                    emptyText="No role-specific recommendations for this resume yet."
                  />
                </div>
              </div>
            ) : (
              /* Empty state: no analysis yet */
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
                    aria-hidden
                  >
                    <FileText className="h-7 w-7" />
                  </span>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Run an analysis to see your ATS score, keyword matches and suggestions.
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

/** Card with a titled bullet list of AI suggestions. */
function SuggestionListCard({
  title,
  icon,
  iconClass,
  items,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  iconClass: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={iconClass}>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ul className="space-y-2.5">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600 dark:bg-teal-400"
                  aria-hidden
                />
                <span className="text-pretty">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}
