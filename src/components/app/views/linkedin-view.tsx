'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { LoadingButton } from '@/components/app/loading-button';
import { Float3D, Rise3D, Tilt3D } from '@/components/app/three-d/motion';
import { apiFetch } from '@/lib/client/api';
import { navigate } from '@/lib/client/navigation';
import { useResumesStore } from '@/stores/resumes-store';
import { type LinkedInResult } from '@/types/ai-tools';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Copy,
  FileText,
  FolderGit2,
  Info,
  Linkedin,
  Sparkles,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Midnight Glass styling recipes ─────────────────────────────────────────

const GLASS = 'border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';
const OUTLINE_BTN =
  'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white';
const PRIMARY_BTN =
  'min-h-[44px] w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_8px_30px_-10px_rgba(139,92,246,0.7)] hover:bg-transparent hover:from-violet-500 hover:to-fuchsia-500 sm:w-auto';

/** Clipboard helper with toast feedback. */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  } catch {
    toast.error('Could not copy — please select the text and copy manually.');
  }
}

/** Small copy-only icon button used across the result sections. */
function CopyIconButton({ text, label }: { text: string; label: string }) {
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={label}
      className={cn('h-8 w-8 shrink-0', OUTLINE_BTN)}
      onClick={() => copyText(text)}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden />
    </Button>
  );
}

/** Card with a list of { name, description } entries, each individually copyable. */
function EntryListCard({
  title,
  icon,
  emptyText,
  entries,
}: {
  title: string;
  icon: React.ReactNode;
  emptyText: string;
  entries: { name: string; description: string }[];
}) {
  return (
    <Card className={cn(GLASS, 'h-full')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-white">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length > 0 ? (
          entries.map((entry, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm font-semibold text-white">{entry.name}</p>
                <CopyIconButton
                  text={`${entry.name}\n${entry.description}`}
                  label={`Copy ${entry.name}`}
                />
              </div>
              <p className="mt-1.5 whitespace-pre-line text-pretty text-sm leading-relaxed text-slate-400">
                {entry.description}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}

/** AI LinkedIn Profile Optimizer: resume → headline, about, skills and more. */
export function LinkedInView() {
  const resumes = useResumesStore((s) => s.resumes);
  const resumesLoaded = useResumesStore((s) => s.loaded);
  const loadingResumes = useResumesStore((s) => s.loading);
  const fetchResumes = useResumesStore((s) => s.fetch);

  const [selectedId, setSelectedId] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<LinkedInResult | null>(null);
  const [resultResumeTitle, setResultResumeTitle] = useState<string | null>(null);
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

  const selectedResume = resumes.find((r) => r.id === selectedId) ?? null;
  const noResumes = (resumesLoaded && resumes.length === 0) || fetchFailed;
  const booting = loadingResumes && !resumesLoaded;

  const optimize = async () => {
    if (!selectedResume || optimizing) return;
    setOptimizing(true);
    try {
      const data = await apiFetch<LinkedInResult>('/api/ai/linkedin', {
        method: 'POST',
        json: { resumeId: selectedResume.id },
      });
      setResult(data);
      setResultResumeTitle(selectedResume.title);
      toast.success('LinkedIn content ready — copy each section below.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <AppShell active="linkedin">
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-violet-500/15 text-violet-300"
            aria-hidden
          >
            <Linkedin className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              LinkedIn Profile Optimizer
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Turn any resume into a polished LinkedIn presence — headline, about section, skills,
              experience blurbs and profile tips.
            </p>
          </div>
        </header>

        <Separator />

        {booting ? (
          /* ── Skeleton while resumes load ── */
          <Card className={GLASS} aria-hidden>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-36 bg-white/[0.06]" />
              <Skeleton className="h-11 w-full rounded-md bg-white/[0.06]" />
              <Skeleton className="h-11 w-40 rounded-md bg-white/[0.06]" />
            </CardContent>
          </Card>
        ) : noResumes ? (
          /* ── Empty state: needs a resume ── */
          <Card className={cn(GLASS, 'border-dashed')}>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Float3D duration={5} wobble={3}>
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-violet-500/10 text-violet-300"
                  aria-hidden
                >
                  <Linkedin className="h-7 w-7" />
                </span>
              </Float3D>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">You need a resume first</h2>
                <p className="mx-auto max-w-sm text-sm text-slate-400">
                  The optimizer grounds every suggestion in the content of one of your resumes.
                  Create one, then come back.
                </p>
              </div>
              <Button
                className={cn(PRIMARY_BTN, 'w-auto')}
                onClick={() => navigate('resumes')}
              >
                Go to My Resumes <ArrowRight className="h-4 w-4" aria-hidden />
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
                    <FileText className="h-4 w-4 text-violet-300" aria-hidden /> Choose a resume
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    The optimizer rewrites your headline, about section and more from this
                    resume&apos;s content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="linkedin-resume" className="text-slate-300">
                      Resume
                    </Label>
                    <Select
                      value={selectedId || undefined}
                      onValueChange={setSelectedId}
                      disabled={optimizing}
                    >
                      <SelectTrigger
                        id="linkedin-resume"
                        className="min-h-[44px] w-full border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"
                      >
                        <SelectValue placeholder="Choose a resume" />
                      </SelectTrigger>
                      <SelectContent className="border-white/[0.08] bg-[#0a0e1f] text-slate-200">
                        {resumes.map((r) => (
                          <SelectItem
                            key={r.id}
                            value={r.id}
                            className="focus:bg-white/[0.06] focus:text-white"
                          >
                            {r.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <LoadingButton
                      loading={optimizing}
                      loadingText="Optimizing your LinkedIn presence…"
                      disabled={!selectedResume}
                      onClick={optimize}
                      className={PRIMARY_BTN}
                    >
                      <Sparkles className="h-4 w-4" aria-hidden /> Optimize My Profile
                    </LoadingButton>
                  </div>
                </CardContent>
              </Card>
            </Rise3D>

            {result ? (
              /* ── Results ── */
              <div className="space-y-6" aria-live="polite">
                {/* a) Headline hero */}
                <Rise3D distance={20} tilt={6}>
                  <Tilt3D max={3}>
                    <Card className={cn(GLASS, 'border-violet-400/20')}>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Headline
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {resultResumeTitle && (
                              <Badge
                                variant="outline"
                                className="max-w-48 border-white/10 text-slate-400"
                              >
                                <FileText className="h-3 w-3 shrink-0" aria-hidden />
                                <span className="truncate">{resultResumeTitle}</span>
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-white/10 text-slate-400">
                              {new Date(result.generatedAt).toLocaleString()}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <p className="min-w-0 flex-1 text-pretty text-lg font-semibold leading-snug text-white">
                            {result.headline}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn('min-h-[36px] shrink-0', OUTLINE_BTN)}
                            onClick={() => copyText(result.headline)}
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
                          </Button>
                        </div>
                        {result.headlineAlternatives.length > 0 && (
                          <div className="space-y-2 border-t border-white/[0.06] pt-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Alternatives
                            </p>
                            <ul className="space-y-2">
                              {result.headlineAlternatives.map((alt, i) => (
                                <li
                                  key={i}
                                  className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                                >
                                  <span className="min-w-0 flex-1 text-sm leading-relaxed text-slate-300">
                                    {alt}
                                  </span>
                                  <CopyIconButton
                                    text={alt}
                                    label={`Copy alternative headline ${i + 1}`}
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Tilt3D>
                </Rise3D>

                {/* b) About section */}
                <Rise3D delay={0.06}>
                  <Card className={GLASS}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-base text-white">
                          <User className="h-4 w-4 text-cyan-300" aria-hidden /> About section
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn('min-h-[36px]', OUTLINE_BTN)}
                          onClick={() => copyText(result.about)}
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-line text-pretty text-sm leading-relaxed text-slate-300">
                        {result.about}
                      </p>
                    </CardContent>
                  </Card>
                </Rise3D>

                {/* c) Skills */}
                <Rise3D delay={0.1}>
                  <Card className={GLASS}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-base text-white">
                          <BadgeCheck className="h-4 w-4 text-cyan-300" aria-hidden /> Skills
                        </CardTitle>
                        {result.skills.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn('min-h-[36px]', OUTLINE_BTN)}
                            onClick={() => copyText(result.skills.join(', '))}
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden /> Copy all
                          </Button>
                        )}
                      </div>
                      <CardDescription className="text-slate-400">
                        Suggested for the Skills section — keep only the ones you can speak to.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {result.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {result.skills.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No skills suggested.</p>
                      )}
                    </CardContent>
                  </Card>
                </Rise3D>

                {/* d) Experience + Projects */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Rise3D delay={0.14} className="h-full">
                    <EntryListCard
                      title="Experience"
                      icon={<Briefcase className="h-4 w-4 text-violet-300" aria-hidden />}
                      emptyText="No experience entries found in the selected resume."
                      entries={result.experience.map((e) => ({
                        name: e.title,
                        description: e.description,
                      }))}
                    />
                  </Rise3D>
                  <Rise3D delay={0.18} className="h-full">
                    <EntryListCard
                      title="Projects"
                      icon={<FolderGit2 className="h-4 w-4 text-fuchsia-300" aria-hidden />}
                      emptyText="No projects found in the selected resume."
                      entries={result.projects.map((p) => ({
                        name: p.name,
                        description: p.description,
                      }))}
                    />
                  </Rise3D>
                </div>

                {/* e) Profile tips */}
                <Rise3D delay={0.22}>
                  <Card className={GLASS}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-white">
                        <Sparkles className="h-4 w-4 text-violet-300" aria-hidden /> Profile tips
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Quick wins to lift your profile&apos;s visibility.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {result.tips.length > 0 ? (
                        <ul className="space-y-2.5">
                          {result.tips.map((tip, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 text-sm text-slate-300"
                            >
                              <Sparkles
                                className="mt-0.5 h-4 w-4 shrink-0 text-violet-300"
                                aria-hidden
                              />
                              <span className="text-pretty">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500">No tips generated.</p>
                      )}
                    </CardContent>
                  </Card>
                </Rise3D>

                {/* Note strip */}
                <p className="flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-xs leading-relaxed text-slate-400 backdrop-blur-xl">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden />
                  Copy each section into your LinkedIn profile. Content is grounded in your resume.
                </p>
              </div>
            ) : optimizing ? (
              /* ── Skeletons while optimizing ── */
              <div className="space-y-4" aria-hidden>
                <Card className={GLASS}>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-3 w-24 bg-white/[0.06]" />
                    <Skeleton className="h-6 w-full bg-white/[0.06]" />
                    <Skeleton className="h-6 w-3/4 bg-white/[0.06]" />
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {[0, 1].map((i) => (
                    <Card key={i} className={GLASS}>
                      <CardContent className="space-y-3">
                        <Skeleton className="h-4 w-32 bg-white/[0.06]" />
                        <Skeleton className="h-3 w-full bg-white/[0.06]" />
                        <Skeleton className="h-3 w-5/6 bg-white/[0.06]" />
                        <Skeleton className="h-3 w-2/3 bg-white/[0.06]" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Empty state: nothing optimized yet ── */
              <Card className={cn(GLASS, 'border-dashed')}>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <Float3D duration={5} wobble={3}>
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-violet-500/10 text-violet-300"
                      aria-hidden
                    >
                      <Linkedin className="h-7 w-7" />
                    </span>
                  </Float3D>
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-white">
                      Your LinkedIn glow-up starts here
                    </h2>
                    <p className="mx-auto max-w-md text-sm text-slate-400">
                      Pick a resume above and run the optimizer — you&apos;ll get a headline, about
                      section, skills, experience blurbs and profile tips.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
