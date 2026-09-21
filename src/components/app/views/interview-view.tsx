'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { LoadingButton } from '@/components/app/loading-button';
import { Float3D, Rise3D } from '@/components/app/three-d/motion';
import { apiFetch } from '@/lib/client/api';
import { navigate } from '@/lib/client/navigation';
import { useResumesStore } from '@/stores/resumes-store';
import { TARGET_ROLES } from '@/types/resume';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, FilePlus2, ListChecks, MessagesSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Result of POST /api/ai/interview-questions. */
interface InterviewQuestionsResult {
  hr: string[];
  technical: string[];
  project: string[];
  behavioral: string[];
  jobSpecific: string[];
  role: string;
}

type TabKey = 'hr' | 'technical' | 'project' | 'behavioral' | 'jobSpecific';

const DATALIST_ID = 'interview-target-roles';

/** Read the persisted practiced-question list for a resume. */
function readPracticed(resumeId: string): string[] {
  try {
    const raw = window.localStorage.getItem(`rra_practiced_${resumeId}`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Persist the practiced-question list for a resume. */
function writePracticed(resumeId: string, questions: string[]): void {
  try {
    window.localStorage.setItem(`rra_practiced_${resumeId}`, JSON.stringify(questions));
  } catch {
    /* storage unavailable — practice state simply won't persist */
  }
}

/** AI Interview Preparation: generate categorized question sets for a resume and track practice. */
export function InterviewView() {
  const resumes = useResumesStore((s) => s.resumes);
  const resumesLoaded = useResumesStore((s) => s.loaded);
  const loadingResumes = useResumesStore((s) => s.loading);
  const fetchResumes = useResumesStore((s) => s.fetch);

  const [resumeId, setResumeId] = useState('');
  const [role, setRole] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<InterviewQuestionsResult | null>(null);
  const [usedResumeId, setUsedResumeId] = useState<string | null>(null);
  const [practiced, setPracticed] = useState<string[]>([]);
  const [tab, setTab] = useState<TabKey>('hr');
  const [fetchFailed, setFetchFailed] = useState(false);
  const bootedRef = useRef(false);

  // Load resumes once.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    if (useResumesStore.getState().loaded) return;
    fetchResumes(true).catch((e: unknown) => {
      setFetchFailed(true);
      toast.error((e as Error).message);
    });
  }, [fetchResumes]);

  const selectedResume = resumes.find((r) => r.id === resumeId) ?? null;
  const noResumes = (resumesLoaded && resumes.length === 0) || fetchFailed;

  const onResumeChange = (id: string) => {
    setResumeId(id);
    const resume = resumes.find((r) => r.id === id);
    if (resume?.targetRole) setRole(resume.targetRole);
  };

  const generate = async () => {
    if (!selectedResume || generating) return;
    setGenerating(true);
    try {
      const data = await apiFetch<InterviewQuestionsResult>('/api/ai/interview-questions', {
        method: 'POST',
        json: { resumeId: selectedResume.id, role: role.trim() || undefined },
      });
      setResult(data);
      setUsedResumeId(selectedResume.id);
      setPracticed(readPracticed(selectedResume.id));
      setTab('hr');
      const total =
        data.hr.length + data.technical.length + data.project.length + data.behavioral.length + data.jobSpecific.length;
      toast.success(`${total} questions generated for the ${data.role} role.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const allQuestions = result
    ? [...result.hr, ...result.technical, ...result.project, ...result.behavioral, ...result.jobSpecific]
    : [];
  const practicedSet = new Set(practiced);
  const practicedCount = allQuestions.filter((q) => practicedSet.has(q)).length;
  const practicedPct = allQuestions.length > 0 ? Math.round((practicedCount / allQuestions.length) * 100) : 0;

  const togglePracticed = (question: string) => {
    setPracticed((prev) => {
      const next = prev.includes(question) ? prev.filter((q) => q !== question) : [...prev, question];
      if (usedResumeId) writePracticed(usedResumeId, next);
      return next;
    });
  };

  const copyQuestion = async (question: string) => {
    try {
      await navigator.clipboard.writeText(question);
      toast.success('Question copied to clipboard.');
    } catch {
      toast.error('Could not copy — please copy the question manually.');
    }
  };

  const tabDefs: { key: TabKey; label: string; items: string[] }[] = result
    ? [
        { key: 'hr', label: 'HR', items: result.hr },
        { key: 'technical', label: 'Technical', items: result.technical },
        { key: 'project', label: 'Project', items: result.project },
        { key: 'behavioral', label: 'Behavioral', items: result.behavioral },
        { key: 'jobSpecific', label: 'Job-specific', items: result.jobSpecific },
      ]
    : [];

  return (
    <AppShell active="interview">
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-600/25 to-fuchsia-600/15 text-violet-300"
            aria-hidden
          >
            <MessagesSquare className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">AI Interview Preparation</h1>
            <p className="mt-1 text-sm text-slate-400">
              Generate tailored HR, technical, project, behavioral and job-specific question sets — and track which
              ones you have practiced.
            </p>
          </div>
        </header>

        {noResumes ? (
          /* Empty state: no resumes yet */
          <Rise3D>
            <Card className="rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <Float3D duration={5}>
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-violet-300"
                    aria-hidden
                  >
                    <FilePlus2 className="h-7 w-7" />
                  </span>
                </Float3D>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-white">You haven&apos;t created a resume yet.</h2>
                  <p className="mx-auto max-w-sm text-sm text-slate-400">
                    Create a resume first — your interview questions are tailored to its content and target role.
                  </p>
                </div>
                <Button
                  onClick={() => navigate('dashboard')}
                  className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
                >
                  <FilePlus2 className="h-4 w-4" aria-hidden /> Create Your First Resume
                </Button>
              </CardContent>
            </Card>
          </Rise3D>
        ) : (
          <>
            {/* Setup card */}
            <Rise3D>
              <Card className="rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <ListChecks className="h-4 w-4 text-violet-300" aria-hidden /> Interview setup
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Choose which resume to prepare for. The role is pre-filled from the resume but can be overridden.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="interview-resume" className="text-slate-300">
                        Resume
                      </Label>
                      <Select
                        value={resumeId || undefined}
                        onValueChange={onResumeChange}
                        disabled={generating || loadingResumes}
                      >
                        <SelectTrigger
                          id="interview-resume"
                          className="min-h-[44px] w-full border-white/10 bg-white/[0.04] text-slate-100"
                        >
                          <SelectValue
                            placeholder={loadingResumes ? 'Loading resumes…' : 'Choose a resume'}
                          />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[#0b1020] text-slate-200">
                          {resumes.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="interview-role" className="text-slate-300">
                        Target role <span className="font-normal text-slate-500">(optional)</span>
                      </Label>
                      <Input
                        id="interview-role"
                        list={DATALIST_ID}
                        placeholder="e.g. Frontend Developer"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        maxLength={120}
                        disabled={generating}
                        className="min-h-[44px] border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600"
                      />
                      <datalist id={DATALIST_ID}>
                        {TARGET_ROLES.map((r) => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <LoadingButton
                      loading={generating}
                      loadingText="Preparing your questions…"
                      disabled={!selectedResume}
                      onClick={generate}
                      className="min-h-[44px] w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 sm:w-auto"
                    >
                      <Sparkles className="h-4 w-4" aria-hidden /> Generate Question Sets
                    </LoadingButton>
                  </div>
                </CardContent>
              </Card>
            </Rise3D>

            {/* Skeleton while generating */}
            {generating && (
              <Card className="rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl" aria-busy>
                <CardContent className="space-y-3 py-6">
                  <Skeleton className="h-4 w-44 bg-white/[0.07]" />
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg bg-white/[0.05]" />
                  ))}
                </CardContent>
              </Card>
            )}

            {result ? (
              /* ── Results ── */
              <div className="space-y-6" aria-live="polite">
                {/* Progress strip */}
                <Rise3D distance={20} tilt={6}>
                  <Card className="rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl">
                    <CardContent className="space-y-2.5 py-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-slate-200">Practice progress</p>
                        <p className="text-sm tabular-nums text-slate-400">
                          <span className="font-semibold text-white">{practicedCount}</span> of{' '}
                          <span className="font-semibold text-white">{allQuestions.length}</span> practiced
                        </p>
                      </div>
                      <Progress
                        value={practicedPct}
                        className="h-2 bg-white/[0.06] [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-cyan-400"
                        aria-label={`${practicedCount} of ${allQuestions.length} questions practiced`}
                      />
                      <p className="text-xs text-slate-500">
                        Prepared for the{' '}
                        <span className="font-medium text-violet-300">{result.role}</span> role. Your “Practiced”
                        marks are saved on this device per resume.
                      </p>
                    </CardContent>
                  </Card>
                </Rise3D>

                {/* Question tabs */}
                <Rise3D delay={0.08} distance={20} tilt={6}>
                  <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="gap-4">
                    <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-white/[0.06] bg-white/[0.04] p-1 backdrop-blur-xl">
                      {tabDefs.map((t) => (
                        <TabsTrigger
                          key={t.key}
                          value={t.key}
                          className="min-h-[36px] flex-1 gap-1.5 rounded-lg border-transparent px-3 text-slate-400 data-[state=active]:bg-violet-500/20 data-[state=active]:text-white"
                        >
                          {t.label}
                          <span className="text-[10px] font-semibold tabular-nums text-slate-500 data-[state=active]:text-violet-200">
                            {t.items.length}
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {tabDefs.map((t) => (
                      <TabsContent key={t.key} value={t.key}>
                        {t.items.length > 0 ? (
                          <ul className="space-y-2.5">
                            {t.items.map((question, i) => {
                              const isPracticed = practicedSet.has(question);
                              return (
                                <li
                                  key={question}
                                  className={cn(
                                    'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                                    isPracticed
                                      ? 'border-emerald-400/25 bg-emerald-400/[0.05]'
                                      : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12]',
                                  )}
                                >
                                  <span
                                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-xs font-semibold text-violet-300"
                                    aria-hidden
                                  >
                                    {i + 1}
                                  </span>
                                  <p
                                    className={cn(
                                      'min-w-0 flex-1 pt-1 text-sm leading-relaxed text-slate-200',
                                      isPracticed && 'text-slate-400',
                                    )}
                                  >
                                    {question}
                                  </p>
                                  <div className="flex shrink-0 items-center gap-1 pt-0.5">
                                    <Label
                                      htmlFor={`practiced-${t.key}-${i}`}
                                      className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400"
                                    >
                                      <Checkbox
                                        id={`practiced-${t.key}-${i}`}
                                        checked={isPracticed}
                                        onCheckedChange={() => togglePracticed(question)}
                                        aria-label={`Mark question ${i + 1} as practiced`}
                                        className="border-white/20 bg-white/[0.04] data-[state=checked]:border-violet-400 data-[state=checked]:bg-violet-600 data-[state=checked]:text-white"
                                      />
                                      Practiced
                                    </Label>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => copyQuestion(question)}
                                      aria-label={`Copy question ${i + 1} to clipboard`}
                                      className="h-8 w-8 text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"
                                    >
                                      <Copy className="h-3.5 w-3.5" aria-hidden />
                                    </Button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="rounded-lg border border-dashed border-white/[0.08] px-4 py-6 text-center text-sm text-slate-500">
                            No questions in this set — the AI found none needed for this category.
                          </p>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                </Rise3D>
              </div>
            ) : (
              !generating && (
                /* Empty state: nothing generated yet */
                <Card className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02]">
                  <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                    <Float3D duration={5} wobble={3}>
                      <span
                        className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-violet-300"
                        aria-hidden
                      >
                        <MessagesSquare className="h-7 w-7" />
                      </span>
                    </Float3D>
                    <p className="max-w-md text-sm text-slate-400">
                      Select a resume and generate question sets to start preparing — every question is tailored to
                      your resume and target role.
                    </p>
                  </CardContent>
                </Card>
              )
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
