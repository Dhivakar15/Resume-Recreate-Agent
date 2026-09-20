'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { LoadingButton } from '@/components/app/loading-button';
import { apiFetch } from '@/lib/client/api';
import { useResumesStore } from '@/stores/resumes-store';
import { type JobMatchAnalysis } from '@/types/resume';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  BriefcaseBusiness,
  Check,
  GraduationCap,
  Clock3,
  Info,
  ListChecks,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MIN_CONTENT_LENGTH = 50;

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

function Chip({ label, className, icon }: { label: string; className: string; icon?: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', className)}>
      {icon}
      {label}
    </span>
  );
}

/** Analyze Job Description: extract requirements and (optionally) match them against a resume. */
export function JobMatchView({ preselectedId }: { preselectedId?: string }) {
  const resumes = useResumesStore((s) => s.resumes);
  const resumesLoaded = useResumesStore((s) => s.loaded);
  const loadingResumes = useResumesStore((s) => s.loading);
  const fetchResumes = useResumesStore((s) => s.fetch);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentError, setContentError] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<JobMatchAnalysis | null>(null);
  const [usedResumeId, setUsedResumeId] = useState<string | null>(null);
  const bootedRef = useRef(false);

  // Load resumes once; preselect the requested resume when it exists.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const applyPreselection = (list: { id: string }[]) => {
      if (preselectedId && list.some((r) => r.id === preselectedId)) setResumeId(preselectedId);
    };
    if (useResumesStore.getState().loaded) {
      applyPreselection(useResumesStore.getState().resumes);
      return;
    }
    fetchResumes(true)
      .then(() => applyPreselection(useResumesStore.getState().resumes))
      .catch((e: unknown) => toast.error((e as Error).message));
  }, [fetchResumes, preselectedId]);

  const contentLength = content.trim().length;
  const matchedResume = usedResumeId ? (resumes.find((r) => r.id === usedResumeId) ?? null) : null;

  const runAnalysis = async () => {
    if (analyzing) return;
    if (contentLength < MIN_CONTENT_LENGTH) {
      setContentError(`Job description must be at least ${MIN_CONTENT_LENGTH} characters (currently ${contentLength}).`);
      return;
    }
    setContentError(null);
    setAnalyzing(true);
    try {
      const payload: { content: string; title?: string; resumeId?: string } = { content: content.trim() };
      if (title.trim()) payload.title = title.trim();
      if (resumeId) payload.resumeId = resumeId;
      const { analysis: result } = await apiFetch<{ analysis: JobMatchAnalysis }>('/api/ai/job-match', {
        method: 'POST',
        json: payload,
      });
      setAnalysis(result);
      setUsedResumeId(resumeId || null);
      toast.success('Job description analyzed — review the extracted requirements below.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const { requirements, match } = analysis ?? {};
  const showMatch = Boolean(analysis && usedResumeId && match);

  return (
    <AppShell active="jobmatch">
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
            aria-hidden
          >
            <BriefcaseBusiness className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Analyze Job Description</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Paste a job description to extract its requirements and compare them with your resume.
            </p>
          </div>
        </header>

        <Separator />

        {/* Input card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-teal-600 dark:text-teal-400" aria-hidden /> Job description
            </CardTitle>
            <CardDescription>Paste the full posting — the more detail, the better the extraction.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="job-title">Job title (optional)</Label>
              <Input
                id="job-title"
                placeholder="e.g. Senior Frontend Developer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                disabled={analyzing}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="job-description">Job description</Label>
                <span
                  className={cn('text-xs tabular-nums', contentError ? 'text-destructive' : 'text-muted-foreground')}
                  aria-live="polite"
                >
                  {contentLength} characters · min {MIN_CONTENT_LENGTH}
                </span>
              </div>
              <Textarea
                id="job-description"
                rows={8}
                placeholder="Paste the job posting here — responsibilities, required skills, technologies, education, experience…"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (contentError && e.target.value.trim().length >= MIN_CONTENT_LENGTH) setContentError(null);
                }}
                disabled={analyzing}
                aria-invalid={contentError ? true : undefined}
                className="min-h-[176px] resize-y"
              />
              {contentError && <p className="text-sm text-destructive">{contentError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-match-resume">Compare with resume (optional)</Label>
              <Select
                value={resumeId || undefined}
                onValueChange={(v) => setResumeId(v)}
                disabled={analyzing || loadingResumes}
              >
                <SelectTrigger id="job-match-resume" className="min-h-[44px] w-full">
                  <SelectValue placeholder={loadingResumes ? 'Loading resumes…' : 'Choose a resume (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a resume to see a match score, matched/missing skills and keyword suggestions.
              </p>
            </div>

            <div className="flex justify-end">
              <LoadingButton
                loading={analyzing}
                loadingText="Analyzing job description…"
                onClick={runAnalysis}
                className="min-h-[44px] w-full sm:w-auto"
              >
                <Sparkles className="h-4 w-4" aria-hidden /> Analyze Job Match
              </LoadingButton>
            </div>
          </CardContent>
        </Card>

        {analysis && requirements ? (
          /* ── Results ── */
          <div className="space-y-6" aria-live="polite">
            {/* 1. Extracted requirements */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">Extracted requirements</CardTitle>
                  {requirements.title && (
                    <Badge variant="outline" className="max-w-full">
                      <BriefcaseBusiness className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{requirements.title}</span>
                    </Badge>
                  )}
                </div>
                <CardDescription>What the AI understood from the job description.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <ChipGroup
                    label="Required Skills"
                    items={requirements.requiredSkills}
                    chipClass="bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                    emptyText="No required skills extracted."
                  />
                  <ChipGroup
                    label="Preferred Skills"
                    items={requirements.preferredSkills}
                    chipClass="bg-muted text-muted-foreground"
                    emptyText="No preferred skills extracted."
                  />
                  <ChipGroup
                    label="Technologies"
                    items={requirements.technologies}
                    chipClass="border border-input bg-background text-foreground"
                    emptyText="No technologies extracted."
                  />
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Responsibilities</h3>
                    {requirements.responsibilities.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-5 text-sm">
                        {requirements.responsibilities.map((r, i) => (
                          <li key={i} className="text-pretty">
                            {r}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No responsibilities extracted.</p>
                    )}
                  </div>
                </div>

                {(requirements.education || requirements.experienceYears) && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {requirements.education && (
                      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Education requirement
                          </p>
                          <p className="mt-0.5 text-sm">{requirements.education}</p>
                        </div>
                      </div>
                    )}
                    {requirements.experienceYears && (
                      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Experience requirement
                          </p>
                          <p className="mt-0.5 text-sm">{requirements.experienceYears}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!usedResumeId && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Select a resume to see how you match this job.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 2. Match section (only when a resume was selected) */}
            {showMatch && match && (
              <Card className="border-teal-600/20">
                <CardHeader>
                  <CardTitle className="text-base">Resume match</CardTitle>
                  <CardDescription>
                    {matchedResume ? `Compared with “${matchedResume.title}”.` : 'Compared with your resume.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
                    <ScoreRing score={match.score} caption="Job match score" />
                    <p className="text-sm text-muted-foreground sm:max-w-xs">
                      The match score compares your resume against the required skills, preferred skills and keywords
                      extracted from this job description.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <ChipGroup
                      label="Matched Skills"
                      items={match.matchedSkills}
                      chipClass="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      icon={<Check className="h-3 w-3" aria-hidden />}
                      emptyText="No matched skills were identified."
                    />
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400">Missing Skills</h3>
                      {match.missingSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {match.missingSkills.map((s) => (
                            <Chip
                              key={s}
                              label={s}
                              className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nothing missing — great alignment.</p>
                      )}
                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                        Missing skills are shown for guidance only. They are never added to your resume automatically.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Suggested Keywords</h3>
                    {match.suggestedKeywords.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {match.suggestedKeywords.map((kw) => (
                          <Chip
                            key={kw}
                            label={kw}
                            className="border border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No extra keywords suggested.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                      <Wand2 className="h-4 w-4 text-teal-600 dark:text-teal-400" aria-hidden /> Suggestions
                    </h3>
                    {match.suggestions.length > 0 ? (
                      <ol className="space-y-2">
                        {match.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600/10 text-[11px] font-semibold text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
                              aria-hidden
                            >
                              {i + 1}
                            </span>
                            <span className="text-pretty">{s}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-sm text-muted-foreground">No suggestions for this combination yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              AI-extracted requirements may be incomplete. Always read the original job posting carefully.
            </p>
          </div>
        ) : (
          /* Empty state: nothing analyzed yet */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
                aria-hidden
              >
                <BriefcaseBusiness className="h-7 w-7" />
              </span>
              <p className="max-w-md text-sm text-muted-foreground">
                Paste a job description above and run the analysis to extract its requirements
                {resumesLoaded && resumes.length > 0 ? ' and see how well your resume matches.' : '.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

/** Titled group of rounded chips with an empty-state fallback. */
function ChipGroup({
  label,
  items,
  chipClass,
  icon,
  emptyText,
}: {
  label: string;
  items: string[];
  chipClass: string;
  icon?: React.ReactNode;
  emptyText: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{label}</h3>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Chip key={item} label={item} className={chipClass} icon={icon} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}
