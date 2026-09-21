'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { LoadingButton } from '@/components/app/loading-button';
import { Float3D, Rise3D, Tilt3D } from '@/components/app/three-d/motion';
import { apiFetch } from '@/lib/client/api';
import { type ProjectDescriptionResult } from '@/types/ai-tools';
import { TARGET_ROLES } from '@/types/resume';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Blocks, Check, Copy, Cpu, ListChecks, ListOrdered, Quote, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Midnight Glass styling recipes ─────────────────────────────────────────

const GLASS = 'border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';
const OUTLINE_BTN =
  'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white';
const PRIMARY_BTN =
  'min-h-[44px] w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_8px_30px_-10px_rgba(139,92,246,0.7)] hover:bg-transparent hover:from-violet-500 hover:to-fuchsia-500 sm:w-auto';
const FIELD = 'border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600 dark:bg-white/[0.04]';

const MIN_NAME = 2;
const MIN_IDEA = 15;

const STEPS = [
  { title: 'Name it', hint: 'Give the project a clear, specific name.' },
  { title: 'Describe it', hint: 'One or two sentences about what it does.' },
  { title: 'Get resume-ready content', hint: 'Overview, bullets and an interview story.' },
] as const;

/** Clipboard helper with toast feedback. */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  } catch {
    toast.error('Could not copy — please select the text and copy manually.');
  }
}

/** AI Project Description Generator: idea → resume-ready content. */
export function ProjectGenView() {
  const [name, setName] = useState('');
  const [idea, setIdea] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [ideaError, setIdeaError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ProjectDescriptionResult | null>(null);

  const nameLength = name.trim().length;
  const ideaLength = idea.trim().length;
  const canGenerate = nameLength >= MIN_NAME && ideaLength >= MIN_IDEA;

  const generate = async () => {
    if (generating) return;
    const nErr =
      nameLength < MIN_NAME ? `Project name must be at least ${MIN_NAME} characters.` : null;
    const iErr =
      ideaLength < MIN_IDEA
        ? `Describe the idea in at least ${MIN_IDEA} characters (currently ${ideaLength}).`
        : null;
    setNameError(nErr);
    setIdeaError(iErr);
    if (nErr || iErr) return;

    setGenerating(true);
    try {
      const data = await apiFetch<ProjectDescriptionResult>('/api/ai/project-description', {
        method: 'POST',
        json: {
          name: name.trim(),
          idea: idea.trim(),
          ...(targetRole.trim() ? { targetRole: targetRole.trim() } : {}),
        },
      });
      setResult(data);
      toast.success('Resume content ready — review it below.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppShell active="projectgen">
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-violet-500/15 text-violet-300"
            aria-hidden
          >
            <Blocks className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Project Description Generator
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Describe a project idea and get resume-ready content — overview, technologies, bullet
              points and an interview explanation.
            </p>
          </div>
        </header>

        <Separator />

        {/* Form card */}
        <Rise3D>
          <Card className={GLASS}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Blocks className="h-4 w-4 text-violet-300" aria-hidden /> Describe your project
              </CardTitle>
              <CardDescription className="text-slate-400">
                The AI turns your idea into polished, recruiter-friendly resume content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="projectgen-name" className="text-slate-300">
                  Project name
                </Label>
                <Input
                  id="projectgen-name"
                  placeholder="e.g. FitTrack — Workout Progress Web App"
                  value={name}
                  maxLength={120}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError && e.target.value.trim().length >= MIN_NAME) setNameError(null);
                  }}
                  disabled={generating}
                  aria-invalid={nameError ? true : undefined}
                  className={FIELD}
                />
                {nameError && <p className="text-xs text-rose-400">{nameError}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Label htmlFor="projectgen-idea" className="text-slate-300">
                    Project idea
                  </Label>
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      ideaError ? 'text-rose-400' : 'text-slate-500',
                    )}
                    aria-live="polite"
                  >
                    {ideaLength} characters · min {MIN_IDEA}
                  </span>
                </div>
                <Textarea
                  id="projectgen-idea"
                  rows={6}
                  placeholder={
                    'Describe the project in a sentence or two — e.g. “A web app that tracks ' +
                    'fitness workouts and shows progress charts”'
                  }
                  value={idea}
                  maxLength={3000}
                  onChange={(e) => {
                    setIdea(e.target.value);
                    if (ideaError && e.target.value.trim().length >= MIN_IDEA) setIdeaError(null);
                  }}
                  disabled={generating}
                  aria-invalid={ideaError ? true : undefined}
                  className={cn(FIELD, 'min-h-[132px] resize-y')}
                />
                {ideaError && <p className="text-xs text-rose-400">{ideaError}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="projectgen-role" className="text-slate-300">
                  Target role (optional)
                </Label>
                <Input
                  id="projectgen-role"
                  list="projectgen-roles"
                  placeholder="e.g. Frontend Developer"
                  value={targetRole}
                  maxLength={80}
                  onChange={(e) => setTargetRole(e.target.value)}
                  disabled={generating}
                  className={FIELD}
                />
                <datalist id="projectgen-roles">
                  {TARGET_ROLES.map((role) => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-500">
                  Tailors the wording to the role you are applying for.
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                {!canGenerate && !generating && (
                  <p className="text-xs text-slate-500">
                    Add a name ({MIN_NAME}+ characters) and an idea ({MIN_IDEA}+ characters) to
                    enable generation.
                  </p>
                )}
                <LoadingButton
                  loading={generating}
                  loadingText="Building your project story…"
                  disabled={!canGenerate}
                  onClick={generate}
                  className={PRIMARY_BTN}
                >
                  <Sparkles className="h-4 w-4" aria-hidden /> Generate Resume Content
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        </Rise3D>

        {result ? (
          /* ── Results ── */
          <div className="space-y-6" aria-live="polite">
            {/* Top bar with copy-all shortcut */}
            {result.bullets.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Generated content</h2>
                <Button
                  variant="outline"
                  className={cn('min-h-[44px]', OUTLINE_BTN)}
                  onClick={() => copyText(result.bullets.join('\n'))}
                >
                  <Copy className="h-4 w-4" aria-hidden /> Copy all bullets
                </Button>
              </div>
            )}

            {/* 1. Overview */}
            <Rise3D distance={20} tilt={6}>
              <Card className={cn(GLASS, 'border-violet-400/20')}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                      <Sparkles className="h-4 w-4 text-violet-300" aria-hidden /> Overview
                    </CardTitle>
                    <Badge variant="outline" className="border-white/10 text-slate-400">
                      {new Date(result.generatedAt).toLocaleString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-pretty text-sm leading-relaxed text-slate-300">
                    {result.overview}
                  </p>
                </CardContent>
              </Card>
            </Rise3D>

            {/* 2. Technologies */}
            <Rise3D delay={0.06}>
              <Card className={GLASS}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Cpu className="h-4 w-4 text-violet-300" aria-hidden /> Technologies
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Tools and stack this project demonstrates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {result.technologies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {result.technologies.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No technologies identified.</p>
                  )}
                </CardContent>
              </Card>
            </Rise3D>

            {/* 3. Responsibilities + Key features */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Rise3D delay={0.1} className="h-full">
                <Tilt3D className="h-full" max={3}>
                  <Card className={cn(GLASS, 'h-full')}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-white">
                        <ListOrdered className="h-4 w-4 text-violet-300" aria-hidden />{' '}
                        Responsibilities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.responsibilities.length > 0 ? (
                        <ol className="space-y-2.5">
                          {result.responsibilities.map((r, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm">
                              <span
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[11px] font-semibold text-violet-300"
                                aria-hidden
                              >
                                {i + 1}
                              </span>
                              <span className="text-pretty text-slate-300">{r}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-sm text-slate-500">No responsibilities generated.</p>
                      )}
                    </CardContent>
                  </Card>
                </Tilt3D>
              </Rise3D>
              <Rise3D delay={0.14} className="h-full">
                <Tilt3D className="h-full" max={3}>
                  <Card className={cn(GLASS, 'h-full')}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-white">
                        <ListChecks className="h-4 w-4 text-cyan-300" aria-hidden /> Key features
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.features.length > 0 ? (
                        <ul className="space-y-2.5">
                          {result.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm">
                              <Check
                                className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300"
                                aria-hidden
                              />
                              <span className="text-pretty text-slate-300">{f}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500">No features generated.</p>
                      )}
                    </CardContent>
                  </Card>
                </Tilt3D>
              </Rise3D>
            </div>

            {/* 4. Resume bullet points */}
            <Rise3D delay={0.18}>
              <Card className={GLASS}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Copy className="h-4 w-4 text-fuchsia-300" aria-hidden /> Resume bullet points
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Action-oriented lines, ready to paste into your resume.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.bullets.length > 0 ? (
                    result.bullets.map((b, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                      >
                        <p className="min-w-0 flex-1 text-pretty text-sm leading-relaxed text-slate-200">
                          {b}
                        </p>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Copy bullet ${i + 1}`}
                          className={cn('h-8 w-8 shrink-0', OUTLINE_BTN)}
                          onClick={() => copyText(b)}
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No bullet points generated.</p>
                  )}
                </CardContent>
              </Card>
            </Rise3D>

            {/* 5. Interview explanation */}
            <Rise3D delay={0.22}>
              <Card className={GLASS}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Quote className="h-4 w-4 text-fuchsia-300" aria-hidden /> Interview explanation
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    How to talk about this project when it comes up in interviews.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="interview-explanation" className="border-white/[0.07]">
                      <AccordionTrigger className="text-sm text-slate-200 hover:text-white hover:no-underline">
                        <span className="flex items-center gap-2">
                          <Quote className="h-4 w-4 text-fuchsia-300" aria-hidden /> Show the
                          explanation
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-slate-300">
                        <p className="whitespace-pre-line text-pretty">
                          {result.interviewExplanation}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </Rise3D>
          </div>
        ) : generating ? (
          /* ── Skeletons while generating ── */
          <div className="space-y-4" aria-hidden>
            <Card className={GLASS}>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-40 bg-white/[0.06]" />
                <Skeleton className="h-3 w-full bg-white/[0.06]" />
                <Skeleton className="h-3 w-4/5 bg-white/[0.06]" />
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <Card key={i} className={GLASS}>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-32 bg-white/[0.06]" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20 rounded-full bg-white/[0.06]" />
                      <Skeleton className="h-6 w-24 rounded-full bg-white/[0.06]" />
                    </div>
                    <Skeleton className="h-3 w-full bg-white/[0.06]" />
                    <Skeleton className="h-3 w-2/3 bg-white/[0.06]" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* ── Empty state before first run ── */
          <Card className={cn(GLASS, 'border-dashed')}>
            <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
              <Float3D duration={5} wobble={3}>
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-violet-500/10 text-violet-300"
                  aria-hidden
                >
                  <Blocks className="h-7 w-7" />
                </span>
              </Float3D>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">
                  Turn a project idea into resume-ready content
                </h2>
                <p className="mx-auto max-w-md text-sm text-slate-400">
                  Name your project, describe what it does, and the AI writes the overview, bullets
                  and interview story for you.
                </p>
              </div>
              <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                {STEPS.map((step, i) => (
                  <div
                    key={step.title}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left"
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-[11px] font-bold text-white"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <p className="mt-2 text-sm font-medium text-slate-200">{step.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.hint}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
