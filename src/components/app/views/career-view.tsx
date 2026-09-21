'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { LoadingButton } from '@/components/app/loading-button';
import { Float3D, Rise3D } from '@/components/app/three-d/motion';
import { apiFetch } from '@/lib/client/api';
import { navigate } from '@/lib/client/navigation';
import { useResumesStore } from '@/stores/resumes-store';
import { type CareerProfileResult } from '@/types/ai-tools';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Check,
  Compass,
  Cpu,
  FilePlus2,
  FolderGit2,
  Lightbulb,
  MessagesSquare,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Midnight Glass recipes ──────────────────────────────────────────────────

const GLASS = 'border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';
const OUTLINE_BTN = 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white min-h-[44px]';
const PRIMARY_BTN =
  'min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500';

const CHIP = {
  emerald: 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  rose: 'border border-rose-400/20 bg-rose-400/10 text-rose-300',
  cyan: 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
} as const;

function Chip({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', className)}>
      {label}
    </span>
  );
}

function ChipCard({
  title,
  description,
  icon,
  chipClass,
  items,
  emptyText,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  chipClass: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <Card className={cn(GLASS, 'h-full')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-white">
          {icon} {title}
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-52 overflow-y-auto pr-0.5 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
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
      </CardContent>
    </Card>
  );
}

/** AI Career Advisor: roles, gaps, roadmap, learning plan and interview prep from a resume. */
export function CareerView() {
  const resumes = useResumesStore((s) => s.resumes);
  const resumesLoaded = useResumesStore((s) => s.loaded);
  const loadingResumes = useResumesStore((s) => s.loading);
  const fetchResumes = useResumesStore((s) => s.fetch);

  const [resumeId, setResumeId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<CareerProfileResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    fetchResumes(!useResumesStore.getState().loaded).catch((e: unknown) => toast.error((e as Error).message));
  }, [fetchResumes]);

  const noResumes = resumesLoaded && resumes.length === 0;
  const selectedResume = resumes.find((r) => r.id === resumeId) ?? null;

  const runGenerate = async () => {
    if (generating || !selectedResume) return;
    setGenerating(true);
    setRunError(null);
    try {
      const data = await apiFetch<CareerProfileResult>('/api/ai/career', {
        method: 'POST',
        json: { resumeId: selectedResume.id },
      });
      setProfile(data);
      toast.success('Career profile ready — time to plan your next move.');
    } catch (e) {
      setRunError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppShell active="career">
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30"
            aria-hidden
          >
            <Compass className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">AI Career Advisor</h1>
            <p className="text-sm text-slate-400">
              A discussion-ready career profile: roles that fit, skills to build, and a roadmap to get there.
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
                  The Career Advisor reads your resume to map your trajectory. Create one first, then come back for your
                  personalized career plan.
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
                    <Compass className="h-4 w-4 text-violet-300" aria-hidden /> Career profile setup
                  </CardTitle>
                  <CardDescription className="text-slate-500">
                    Choose which resume the advisor should analyze.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="career-resume" className="text-slate-300">
                      Resume
                    </Label>
                    <Select value={resumeId || undefined} onValueChange={setResumeId} disabled={generating || loadingResumes}>
                      <SelectTrigger
                        id="career-resume"
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
                  <div className="flex justify-end">
                    <LoadingButton
                      loading={generating}
                      loadingText="Analyzing your career trajectory…"
                      disabled={!selectedResume}
                      onClick={runGenerate}
                      className={cn(PRIMARY_BTN, 'w-full sm:w-auto')}
                    >
                      <Sparkles className="h-4 w-4" aria-hidden /> Generate Career Profile
                    </LoadingButton>
                  </div>
                  {!selectedResume && <p className="text-xs text-slate-500">Choose a resume to enable generation.</p>}
                </CardContent>
              </Card>
            </Rise3D>

            {generating ? (
              /* Loading skeleton */
              <div className="space-y-6" aria-live="polite" aria-busy="true">
                <Card className={GLASS}>
                  <CardContent className="space-y-3 py-6">
                    <Skeleton className="h-5 w-1/3 bg-white/[0.06]" />
                    <Skeleton className="h-3 w-full bg-white/[0.06]" />
                    <Skeleton className="h-3 w-11/12 bg-white/[0.06]" />
                    <Skeleton className="h-3 w-4/5 bg-white/[0.06]" />
                  </CardContent>
                </Card>
                <Card className={GLASS}>
                  <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-28 w-full bg-white/[0.06]" />
                    ))}
                  </CardContent>
                </Card>
                <Card className={GLASS}>
                  <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-36 w-full bg-white/[0.06]" />
                    ))}
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
                  <Button variant="outline" className={OUTLINE_BTN} onClick={runGenerate}>
                    <RefreshCw className="h-4 w-4" aria-hidden /> Retry
                  </Button>
                </CardContent>
              </Card>
            ) : profile ? (
              /* ── Results ── */
              <div className="space-y-6" aria-live="polite">
                {/* a) Summary + recommended job roles */}
                <Rise3D distance={20} tilt={6}>
                  <Card className={GLASS}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-white">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
                          <Sparkles className="h-4 w-4" aria-hidden />
                        </span>
                        Career Summary
                      </CardTitle>
                      <CardDescription className="text-slate-500">
                        Generated {new Date(profile.generatedAt).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="text-sm leading-relaxed text-slate-300">{profile.summary}</p>
                      <div className="space-y-3">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                          <BriefcaseBusiness className="h-4 w-4 text-cyan-300" aria-hidden /> Recommended Job Roles
                        </h3>
                        {profile.jobRoles.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {profile.jobRoles.map((role, i) => (
                              <div key={`${role.title}-${i}`} className="space-y-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="min-w-0 truncate text-sm font-semibold text-slate-100">{role.title}</p>
                                  <span className="shrink-0 text-sm font-bold tabular-nums text-violet-300">
                                    {Math.round(role.matchScore)}%
                                  </span>
                                </div>
                                <Progress
                                  value={Math.max(0, Math.min(100, role.matchScore))}
                                  className="h-1.5 bg-white/[0.06] [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-fuchsia-400"
                                  aria-label={`${role.title}: ${role.matchScore}% match`}
                                />
                                <p className="text-xs leading-relaxed text-slate-500">{role.why}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No role matches were generated.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Rise3D>

                {/* b) Skills in demand / gaps / technologies */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Rise3D delay={0.06} className="h-full">
                    <ChipCard
                      title="Skills in Demand"
                      description="Strengths the market is looking for in you."
                      icon={<TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden />}
                      chipClass={CHIP.emerald}
                      items={profile.skillsInDemand}
                      emptyText="No skills in demand identified."
                    />
                  </Rise3D>
                  <Rise3D delay={0.1} className="h-full">
                    <ChipCard
                      title="Skill Gaps"
                      description="Areas to strengthen for your next role."
                      icon={<Target className="h-4 w-4 text-rose-400" aria-hidden />}
                      chipClass={CHIP.rose}
                      items={profile.skillGaps}
                      emptyText="No skill gaps identified."
                    />
                  </Rise3D>
                  <Rise3D delay={0.14} className="h-full">
                    <ChipCard
                      title="Technologies to Adopt"
                      description="Modern tooling worth adding to your stack."
                      icon={<Cpu className="h-4 w-4 text-cyan-300" aria-hidden />}
                      chipClass={CHIP.cyan}
                      items={profile.technologies}
                      emptyText="No technologies suggested."
                    />
                  </Rise3D>
                </div>

                {/* c) Career roadmap timeline */}
                <Rise3D delay={0.18}>
                  <Card className={GLASS}>
                    <CardHeader>
                      <CardTitle className="text-base text-white">Career Roadmap</CardTitle>
                      <CardDescription className="text-slate-500">
                        A phased plan — hit each milestone before moving on.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {profile.roadmap.length > 0 ? (
                        <ol className="relative space-y-6 border-l border-white/[0.08] pl-6">
                          {profile.roadmap.map((step, i) => (
                            <li key={`${step.phase}-${i}`} className="relative">
                              <span
                                className="absolute -left-[36px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] font-bold text-white shadow-[0_0_14px_-2px_rgba(139,92,246,0.7)]"
                                aria-hidden
                              >
                                {i + 1}
                              </span>
                              <div className="space-y-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <h3 className="text-sm font-semibold text-white">{step.phase}</h3>
                                  <Badge variant="outline" className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                                    {step.timeframe}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-400">{step.focus}</p>
                                {step.milestones.length > 0 && (
                                  <ul className="space-y-1.5">
                                    {step.milestones.map((m, j) => (
                                      <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                                        <span className="text-pretty">{m}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="py-4 text-center text-sm text-slate-500">No roadmap was generated.</p>
                      )}
                    </CardContent>
                  </Card>
                </Rise3D>

                {/* d) Learning + certifications */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Rise3D delay={0.22} className="h-full">
                    <Card className={cn(GLASS, 'h-full')}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-white">
                          <Lightbulb className="h-4 w-4 text-amber-300" aria-hidden /> Learning Recommendations
                        </CardTitle>
                        <CardDescription className="text-slate-500">What to study next, and why it matters.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {profile.learning.length > 0 ? (
                          <div className="max-h-96 space-y-3 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
                            {profile.learning.map((item, i) => (
                              <div key={`${item.topic}-${i}`} className="space-y-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3.5">
                                <p className="text-sm font-semibold text-slate-100">{item.topic}</p>
                                <p className="flex items-start gap-1.5 text-xs text-violet-300">
                                  <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                  <span>{item.resources}</span>
                                </p>
                                <p className="text-xs leading-relaxed text-slate-500">{item.why}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No learning recommendations.</p>
                        )}
                      </CardContent>
                    </Card>
                  </Rise3D>
                  <Rise3D delay={0.26} className="h-full">
                    <Card className={cn(GLASS, 'h-full')}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-white">
                          <Award className="h-4 w-4 text-fuchsia-300" aria-hidden /> Certifications Worth Pursuing
                        </CardTitle>
                        <CardDescription className="text-slate-500">Credentials that strengthen your profile.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {profile.certifications.length > 0 ? (
                          <div className="max-h-96 space-y-3 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
                            {profile.certifications.map((cert, i) => (
                              <div key={`${cert.name}-${i}`} className="space-y-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="min-w-0 text-sm font-semibold text-slate-100">{cert.name}</p>
                                  <Badge variant="outline" className="shrink-0 border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                                    {cert.provider}
                                  </Badge>
                                </div>
                                <p className="text-xs leading-relaxed text-slate-500">{cert.why}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No certifications suggested.</p>
                        )}
                      </CardContent>
                    </Card>
                  </Rise3D>
                </div>

                {/* e) Projects + interview topics */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Rise3D delay={0.3} className="h-full">
                    <Card className={cn(GLASS, 'h-full')}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-white">
                          <FolderGit2 className="h-4 w-4 text-violet-300" aria-hidden /> Projects to Build
                        </CardTitle>
                        <CardDescription className="text-slate-500">
                          Portfolio pieces that prove the skills above.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {profile.projectsToBuild.length > 0 ? (
                          <ol className="space-y-2.5">
                            {profile.projectsToBuild.map((p, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                                <span
                                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-300"
                                  aria-hidden
                                >
                                  {i + 1}
                                </span>
                                <span className="text-pretty">{p}</span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-sm text-slate-500">No project ideas suggested.</p>
                        )}
                      </CardContent>
                    </Card>
                  </Rise3D>
                  <Rise3D delay={0.34} className="h-full">
                    <Card className={cn(GLASS, 'h-full')}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-white">
                          <MessagesSquare className="h-4 w-4 text-cyan-300" aria-hidden /> Interview Topics
                        </CardTitle>
                        <CardDescription className="text-slate-500">Be ready to discuss these confidently.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-52 overflow-y-auto pr-0.5 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
                          {profile.interviewTopics.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {profile.interviewTopics.map((t, i) => (
                                <Chip key={`${t}-${i}`} label={t} className={CHIP.cyan} />
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">No interview topics suggested.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Rise3D>
                </div>
              </div>
            ) : (
              /* Discussion-ready empty state */
              <Card className={cn(GLASS, 'border-dashed')}>
                <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                  <Float3D duration={5} wobble={3}>
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] text-slate-400" aria-hidden>
                      <Compass className="h-7 w-7" />
                    </span>
                  </Float3D>
                  <p className="max-w-md text-sm text-slate-400">
                    Your discussion-ready career profile will appear here — recommended roles, skills in demand, a phased
                    roadmap, learning picks and interview prep, all in one place.
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
