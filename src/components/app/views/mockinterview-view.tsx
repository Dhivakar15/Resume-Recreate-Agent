'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { LoadingButton } from '@/components/app/loading-button';
import { Float3D, Rise3D, Tilt3D } from '@/components/app/three-d/motion';
import { apiFetch } from '@/lib/client/api';
import { navigate } from '@/lib/client/navigation';
import { useResumesStore } from '@/stores/resumes-store';
import { TARGET_ROLES } from '@/types/resume';
import { type MockAnswerEvaluation, type MockInterviewResult } from '@/types/ai-tools';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Check,
  FilePlus2,
  Mic,
  PhoneOff,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MockTurnResponse = MockInterviewResult & { questionNumber: number };

type ThreadItem =
  | { id: number; kind: 'question'; text: string; qType: string | null; number: number }
  | { id: number; kind: 'answer'; text: string }
  | { id: number; kind: 'evaluation'; evaluation: MockAnswerEvaluation };

const DATALIST_ID = 'mock-interview-target-roles';
const RING_GRADIENT_ID = 'rra-mock-ring-gradient';

/** Score badge tone: emerald ≥ 70, amber 40–69, rose < 40. */
function scoreBadgeClass(score: number): string {
  if (score >= 70) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
  if (score >= 40) return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  return 'border-rose-400/30 bg-rose-400/10 text-rose-300';
}

/** Question-type badge tone (accent varies by category, violet default). */
function questionTypeClass(qType: string): string {
  const t = qType.toLowerCase();
  if (t.includes('tech')) return 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300';
  if (t.includes('behavior')) return 'border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300';
  return 'border-violet-400/25 bg-violet-400/10 text-violet-300';
}

/** Donut ring with a violet→fuchsia→cyan gradient stroke, overall score centred. */
function OverallScoreRing({ score }: { score: number }) {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className="relative h-40 w-40 shrink-0 sm:h-44 sm:w-44">
      <svg
        viewBox="0 0 144 144"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`Overall interview score: ${clamped} out of 100`}
      >
        <defs>
          <linearGradient id={RING_GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx="72" cy="72" r={radius} fill="none" strokeWidth="10" className="stroke-white/[0.07]" />
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke={`url(#${RING_GRADIENT_ID})`}
          className="transition-[stroke-dashoffset] duration-700"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums text-white sm:text-5xl">{clamped}</span>
        <span className="text-xs text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

/** AI Mock Interview: a conversational interviewer that asks, evaluates and wraps up with a score. */
export function MockInterviewView() {
  const resumes = useResumesStore((s) => s.resumes);
  const resumesLoaded = useResumesStore((s) => s.loaded);
  const loadingResumes = useResumesStore((s) => s.loading);
  const fetchResumes = useResumesStore((s) => s.fetch);

  // Setup state (kept across sessions so "Restart" can go again immediately)
  const [resumeId, setResumeId] = useState('');
  const [role, setRole] = useState('');
  const [fetchFailed, setFetchFailed] = useState(false);

  // Interview state
  const [phase, setPhase] = useState<'idle' | 'active' | 'finished'>('idle');
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [askedHistory, setAskedHistory] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentQType, setCurrentQType] = useState<string | null>(null);
  const [currentQNumber, setCurrentQNumber] = useState(0);
  const [usedResumeId, setUsedResumeId] = useState<string | null>(null);
  const [usedRole, setUsedRole] = useState('');
  const [wrapUp, setWrapUp] = useState<MockInterviewResult['wrapUp']>(null);
  const [answer, setAnswer] = useState('');
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);

  const idRef = useRef(0);
  const threadEndRef = useRef<HTMLDivElement>(null);
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

  // Keep the newest message in view.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [thread, submitting, wrapUp]);

  const selectedResume = resumes.find((r) => r.id === resumeId) ?? null;
  const noResumes = (resumesLoaded && resumes.length === 0) || fetchFailed;

  const onResumeChange = (id: string) => {
    setResumeId(id);
    const resume = resumes.find((r) => r.id === id);
    if (resume?.targetRole) setRole(resume.targetRole);
  };

  const resetSession = () => {
    setThread([]);
    setAskedHistory([]);
    setCurrentQuestion(null);
    setCurrentQType(null);
    setCurrentQNumber(0);
    setUsedResumeId(null);
    setUsedRole('');
    setWrapUp(null);
    setAnswer('');
    setSubmitting(false);
    setTurnError(null);
    setPhase('idle');
  };

  /** First API call — fetch the opening question. */
  const startInterview = async () => {
    const resume = selectedResume;
    if (!resume || starting) return;
    setStarting(true);
    setTurnError(null);
    try {
      const roleUsed = role.trim();
      const data = await apiFetch<MockTurnResponse>('/api/ai/mock-interview', {
        method: 'POST',
        json: { resumeId: resume.id, role: roleUsed || undefined, askedHistory: [] },
      });
      idRef.current = 0;
      const opening = data.nextQuestion ?? '';
      setThread([
        { id: idRef.current++, kind: 'question', text: opening, qType: data.questionType, number: data.questionNumber },
      ]);
      setAskedHistory(opening ? [opening] : []);
      setCurrentQuestion(opening || null);
      setCurrentQType(data.questionType);
      setCurrentQNumber(data.questionNumber);
      setUsedResumeId(resume.id);
      setUsedRole(roleUsed);
      setWrapUp(null);
      setAnswer('');
      if (data.finished && data.wrapUp) {
        setWrapUp(data.wrapUp);
        setPhase('finished');
      } else {
        setPhase('active');
      }
      toast.success('Mock interview started — good luck!');
    } catch (e) {
      const message = (e as Error).message;
      setTurnError(message);
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  /** Subsequent API calls — submit the answer for the current question, receive evaluation + next question. */
  const submitAnswer = async () => {
    const text = answer.trim();
    if (!text || submitting || !currentQuestion) return;
    const answerId = idRef.current++;
    setThread((t) => [...t, { id: answerId, kind: 'answer', text }]);
    setAnswer('');
    setSubmitting(true);
    setTurnError(null);
    try {
      const data = await apiFetch<MockTurnResponse>('/api/ai/mock-interview', {
        method: 'POST',
        json: {
          resumeId: usedResumeId ?? resumeId,
          role: usedRole || undefined,
          askedHistory,
          question: currentQuestion,
          answer: text,
        },
      });
      const evaluation = data.evaluation;
      if (evaluation) {
        setThread((t) => [...t, { id: idRef.current++, kind: 'evaluation', evaluation }]);
      }
      if (data.finished && data.wrapUp) {
        setWrapUp(data.wrapUp);
        setPhase('finished');
        toast.success('Interview complete — check your wrap-up below.');
      } else {
        const nextQuestion = data.nextQuestion;
        if (nextQuestion) {
          setThread((t) => [
            ...t,
            {
              id: idRef.current++,
              kind: 'question',
              text: nextQuestion,
              qType: data.questionType,
              number: data.questionNumber,
            },
          ]);
          setAskedHistory((h) => [...h, nextQuestion]);
          setCurrentQuestion(nextQuestion);
          setCurrentQType(data.questionType);
          setCurrentQNumber(data.questionNumber);
        } else {
          // Defensive: server ended without a wrap-up payload.
          setPhase('finished');
        }
      }
    } catch (e) {
      // Roll back the optimistic answer so nothing is lost and the turn can be retried.
      setThread((t) => t.filter((item) => item.id !== answerId));
      setAnswer(text);
      const message = (e as Error).message;
      setTurnError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  /** Restart after wrap-up: reset everything and begin a fresh session. */
  const restartInterview = async () => {
    resetSession();
    await startInterview();
  };

  return (
    <AppShell active="mockinterview">
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-600/25 to-fuchsia-600/15 text-violet-300"
            aria-hidden
          >
            <Mic className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">AI Mock Interview</h1>
            <p className="mt-1 text-sm text-slate-400">
              Practice answering with a real interview flow — every answer is scored and you get actionable feedback.
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
                    Create a resume first — the interviewer bases every question on its content and target role.
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
                    <Sparkles className="h-4 w-4 text-violet-300" aria-hidden /> Interview setup
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    The AI interviewer asks 5 questions based on your resume, evaluates each answer, then wraps up
                    with an overall score.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="mock-resume" className="text-slate-300">
                        Resume
                      </Label>
                      <Select
                        value={resumeId || undefined}
                        onValueChange={onResumeChange}
                        disabled={starting || submitting || phase !== 'idle'}
                      >
                        <SelectTrigger
                          id="mock-resume"
                          className="min-h-[44px] w-full border-white/10 bg-white/[0.04] text-slate-100"
                        >
                          <SelectValue placeholder={loadingResumes ? 'Loading resumes…' : 'Choose a resume'} />
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
                      <Label htmlFor="mock-role" className="text-slate-300">
                        Target role <span className="font-normal text-slate-500">(optional)</span>
                      </Label>
                      <Input
                        id="mock-role"
                        list={DATALIST_ID}
                        placeholder="e.g. Backend Developer"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        maxLength={120}
                        disabled={starting || submitting || phase !== 'idle'}
                        className="min-h-[44px] border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600"
                      />
                      <datalist id={DATALIST_ID}>
                        {TARGET_ROLES.map((r) => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  {phase === 'idle' && (
                    <div className="flex justify-end">
                      <LoadingButton
                        loading={starting}
                        loadingText="Preparing your first question…"
                        disabled={!selectedResume}
                        onClick={startInterview}
                        className="min-h-[44px] w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 sm:w-auto"
                      >
                        <Mic className="h-4 w-4" aria-hidden /> Start Mock Interview
                      </LoadingButton>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Rise3D>

            {/* Interview thread / empty state */}
            {phase === 'idle' && !starting ? (
              <Rise3D delay={0.06}>
                <Card className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02]">
                  <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                    <Float3D duration={5} wobble={3}>
                      <span
                        className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-violet-300"
                        aria-hidden
                      >
                        <Mic className="h-7 w-7" />
                      </span>
                    </Float3D>
                    <p className="max-w-md text-sm text-slate-400">
                      Practice with an AI interviewer. It asks 5 questions tailored to your resume, evaluates every
                      answer, and wraps up with a score.
                    </p>
                  </CardContent>
                </Card>
              </Rise3D>
            ) : (
              <Rise3D delay={0.06} distance={20} tilt={6}>
                <Card className="rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl">
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base text-white">
                        <Bot className="h-4 w-4 text-violet-300" aria-hidden /> Interview in progress
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        {phase === 'finished'
                          ? 'Session complete — your wrap-up is below.'
                          : currentQuestion
                            ? `Answering question ${currentQNumber}`
                            : 'Waiting for the interviewer…'}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {phase === 'active' && currentQuestion && (
                        <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-xs font-semibold text-violet-300 tabular-nums">
                          Question {currentQNumber}
                        </span>
                      )}
                      {phase === 'active' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="min-h-[44px] border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                            >
                              <PhoneOff className="h-4 w-4" aria-hidden />
                              <span className="hidden sm:inline">End session</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-white/10 bg-[#0b1020] text-slate-100">
                            <AlertDialogHeader>
                              <AlertDialogTitle>End this mock interview?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                The current session and its evaluations will be discarded. You can start a fresh
                                interview at any time.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white">
                                Keep going
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={resetSession}
                                className="bg-rose-600 text-white hover:bg-rose-500"
                              >
                                End session
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Chat thread */}
                    <div
                      className="max-h-[480px] space-y-4 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]"
                      aria-live="polite"
                      aria-label="Interview conversation"
                    >
                      {starting && (
                        <div className="flex items-start gap-2.5">
                          <Skeleton className="h-7 w-7 shrink-0 rounded-full bg-white/[0.07]" />
                          <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tl-sm bg-white/[0.05]" />
                        </div>
                      )}
                      {thread.map((item) => {
                        if (item.kind === 'question') {
                          return (
                            <div key={item.id} className="flex items-start gap-2.5">
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/15 text-violet-300"
                                aria-hidden
                              >
                                <Bot className="h-3.5 w-3.5" />
                              </span>
                              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-violet-400/20 bg-violet-500/[0.08] px-4 py-3 backdrop-blur-xl">
                                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/80 tabular-nums">
                                    Question {item.number}
                                  </span>
                                  {item.qType && (
                                    <span
                                      className={cn(
                                        'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                                        questionTypeClass(item.qType),
                                      )}
                                    >
                                      {item.qType}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm leading-relaxed text-slate-100">{item.text}</p>
                              </div>
                            </div>
                          );
                        }
                        if (item.kind === 'answer') {
                          return (
                            <div key={item.id} className="flex items-start justify-end gap-2.5">
                              <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-cyan-400/20 bg-cyan-500/[0.08] px-4 py-3 backdrop-blur-xl">
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                                  {item.text}
                                </p>
                              </div>
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/15 text-cyan-300"
                                aria-hidden
                              >
                                <User className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          );
                        }
                        const { score, feedback, strengths, improvements } = item.evaluation;
                        return (
                          <div
                            key={item.id}
                            className="ml-9 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-xl"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Answer evaluation
                              </p>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums',
                                  scoreBadgeClass(score),
                                )}
                              >
                                {score}
                                <span className="font-normal opacity-70">/ 100</span>
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-slate-200">{feedback}</p>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                                  <Check className="h-3.5 w-3.5" aria-hidden /> Strengths
                                </p>
                                {strengths.length > 0 ? (
                                  <ul className="space-y-1">
                                    {strengths.map((s, i) => (
                                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                                        <span
                                          className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-emerald-400"
                                          aria-hidden
                                        />
                                        <span className="text-pretty">{s}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-500">None identified for this answer.</p>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                                  <ArrowRight className="h-3.5 w-3.5" aria-hidden /> Improvements
                                </p>
                                {improvements.length > 0 ? (
                                  <ul className="space-y-1">
                                    {improvements.map((s, i) => (
                                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                                        <ArrowRight
                                          className="mt-[3px] h-3 w-3 shrink-0 text-amber-400/70"
                                          aria-hidden
                                        />
                                        <span className="text-pretty">{s}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-500">Nothing to improve — strong answer.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {submitting && (
                        <div className="flex items-start justify-end gap-2.5">
                          <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                            <span className="flex items-center gap-2 text-xs text-slate-400">
                              <span className="flex gap-1" aria-hidden>
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:0ms]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:150ms]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:300ms]" />
                              </span>
                              Evaluating your answer…
                            </span>
                          </div>
                        </div>
                      )}
                      <div ref={threadEndRef} />
                    </div>

                    {/* Inline turn error (thread state is preserved on failure) */}
                    {turnError && phase !== 'finished' && (
                      <p
                        role="alert"
                        className="flex items-start gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/[0.06] px-3 py-2 text-sm text-rose-300"
                      >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        {turnError}
                      </p>
                    )}

                    {/* Answer input — pinned below the thread, hidden once finished */}
                    {phase === 'active' && (
                      <div className="space-y-2.5">
                        <div className="space-y-1.5">
                          <Label htmlFor="mock-answer" className="text-slate-300">
                            Your answer for question {currentQNumber}
                            {currentQType ? (
                              <span className="font-normal text-slate-500"> · {currentQType}</span>
                            ) : null}
                          </Label>
                          <Textarea
                            id="mock-answer"
                            rows={4}
                            placeholder="Type your answer — structure it clearly, use concrete examples where you can…"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            disabled={submitting}
                            className="min-h-[96px] resize-y border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600"
                          />
                        </div>
                        <div className="flex justify-end">
                          <LoadingButton
                            loading={submitting}
                            loadingText="Evaluating…"
                            disabled={!answer.trim() || !currentQuestion}
                            onClick={submitAnswer}
                            className="min-h-[44px] w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 sm:w-auto"
                          >
                            <SendHorizontal className="h-4 w-4" aria-hidden /> Submit answer
                          </LoadingButton>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Rise3D>
            )}

            {/* Wrap-up / celebration panel */}
            {phase === 'finished' && wrapUp && (
              <Rise3D distance={24} tilt={8}>
                <Card className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600/20 via-fuchsia-600/15 to-cyan-500/20 blur-[80px]"
                  />
                  <CardHeader className="relative">
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                      <Trophy className="h-4 w-4 text-amber-400" aria-hidden /> Interview complete
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Here is how the AI interviewer rated your overall performance.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative space-y-6">
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
                      <Tilt3D max={3}>
                        <OverallScoreRing score={wrapUp.overallScore} />
                      </Tilt3D>
                      <p className="text-sm leading-relaxed text-slate-300 sm:max-w-md">{wrapUp.summary}</p>
                    </div>
                    {wrapUp.finalTips.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                          <Sparkles className="h-4 w-4 text-violet-300" aria-hidden /> Final tips
                        </h3>
                        <ul className="space-y-2">
                          {wrapUp.finalTips.map((tip, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-sm text-slate-300"
                            >
                              <span
                                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[11px] font-semibold text-violet-300"
                                aria-hidden
                              >
                                {i + 1}
                              </span>
                              <span className="text-pretty">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={restartInterview}
                        disabled={starting}
                        className="min-h-[44px] border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden /> Restart interview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Rise3D>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
