'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { LoadingButton } from '@/components/app/loading-button';
import { NewResumeDialog } from '@/components/app/new-resume-dialog';
import { Float3D, Rise3D, Tilt3D } from '@/components/app/three-d/motion';
import { apiFetch } from '@/lib/client/api';
import { navigate } from '@/lib/client/navigation';
import { useResumesStore, type ResumeSummary } from '@/stores/resumes-store';
import { REWRITE_MODES, type RewriteMode, type RewriteResult } from '@/types/ai-tools';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Wand2,
  Copy,
  RefreshCw,
  Sparkles,
  Info,
  FilePlus2,
  CircleAlert,
  Files,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GLASS = 'border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';
const MIN_CHARS = 10;
const MAX_CHARS = 6000;

/** Dark-glass resume selector listing "title — targetRole". */
function ResumeSelect({
  id,
  label,
  value,
  onChange,
  disabled,
  resumes,
  loading,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  resumes: ResumeSummary[];
  loading: boolean;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-slate-300">
        {label}
      </Label>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled || loading}>
        <SelectTrigger
          id={id}
          className="min-h-[44px] w-full border-white/10 bg-white/[0.04] text-slate-100 data-[placeholder]:text-slate-500"
        >
          <SelectValue placeholder={loading ? 'Loading resumes…' : placeholder} />
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
  );
}

function VariantSkeleton() {
  return (
    <div className={cn('h-44 animate-pulse rounded-xl', GLASS)} aria-hidden />
  );
}

/** AI Resume Rewriter — paste a section, pick a mode, get 3 polished variants. */
export function RewriterView({ preselectedId }: { preselectedId?: string }) {
  const resumes = useResumesStore((s) => s.resumes);
  const resumesLoaded = useResumesStore((s) => s.loaded);
  const loadingResumes = useResumesStore((s) => s.loading);
  const fetchResumes = useResumesStore((s) => s.fetch);

  const [selectedId, setSelectedId] = useState('');
  const [text, setText] = useState('');
  const [selectedMode, setSelectedMode] = useState<RewriteMode>('improve');
  const [variants, setVariants] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const bootedRef = useRef(false);

  // Load resumes once; preselect the requested resume when it exists.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const applyPreselection = (list: ResumeSummary[]) => {
      if (preselectedId && list.some((r) => r.id === preselectedId)) setSelectedId(preselectedId);
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

  const noResumes = (resumesLoaded && resumes.length === 0) || fetchFailed;
  const selectedResume = resumes.find((r) => r.id === selectedId) ?? null;
  const activeMode = REWRITE_MODES.find((m) => m.key === selectedMode) ?? REWRITE_MODES[1];
  const trimmedLen = text.trim().length;
  const tooShort = trimmedLen > 0 && trimmedLen < MIN_CHARS;
  const showGate = noResumes && !standalone;

  const generate = useCallback(async () => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_CHARS) {
      setError('Write at least 10 characters so the AI has something to work with.');
      return;
    }
    setGenerating(true);
    setError(null);
    setVariants([]); // clear old variants while generating
    try {
      const result = await apiFetch<RewriteResult>('/api/ai/rewrite', {
        method: 'POST',
        json: {
          text: trimmed,
          mode: selectedMode,
          resumeId: selectedId || undefined,
          targetRole: selectedResume?.targetRole ?? undefined,
        },
      });
      setVariants(result.variants);
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }, [text, selectedMode, selectedId, selectedResume]);

  const copyVariant = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied');
    } catch {
      toast.error('Could not access the clipboard — please copy the text manually.');
    }
  };

  return (
    <AppShell active="rewriter">
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"
            aria-hidden
          >
            <Wand2 className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">AI Resume Rewriter</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Rewrite any resume section in 8 modes — sharper wording, stronger verbs, ATS-friendly keywords.
            </p>
          </div>
        </header>

        {showGate ? (
          /* Empty state: no resumes yet */
          <Rise3D>
            <Card className={cn('border-dashed', GLASS)}>
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <Float3D duration={5}>
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15 text-violet-300 shadow-[0_0_30px_-8px_rgba(139,92,246,0.6)]"
                    aria-hidden
                  >
                    <Files className="h-7 w-7" />
                  </span>
                </Float3D>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-white">You haven&apos;t created a resume yet.</h2>
                  <p className="mx-auto max-w-md text-sm text-slate-400">
                    The rewriter also works standalone on pasted text, but linking a resume gives the AI context about
                    your role and skills for better rewrites.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
                    onClick={() => navigate('resumes')}
                  >
                    <Files className="h-4 w-4" aria-hidden /> Go to My Resumes
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-[44px] border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                    onClick={() => setCreateOpen(true)}
                  >
                    <FilePlus2 className="h-4 w-4" aria-hidden /> Create a resume
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-[44px] text-slate-400 hover:bg-white/[0.06] hover:text-white"
                    onClick={() => setStandalone(true)}
                  >
                    Use without a resume
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Rise3D>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ── Left column: input ── */}
            <Rise3D className="h-full">
              <Tilt3D className="h-full" max={3}>
                <Card className={cn('h-full', GLASS)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                      <Sparkles className="h-4 w-4 text-violet-300" aria-hidden /> What should the AI rewrite?
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Paste a summary, bullet point or any section — get 3 polished variants back.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <ResumeSelect
                      id="rewriter-resume"
                      label="Resume (optional — improves context)"
                      value={selectedId}
                      onChange={(id) => setSelectedId(id)}
                      disabled={generating}
                      resumes={resumes}
                      loading={loadingResumes}
                      placeholder="Choose a resume for extra context"
                    />

                    <div className="space-y-1.5">
                      <Label htmlFor="rewriter-text" className="text-slate-300">
                        Section text
                      </Label>
                      <Textarea
                        id="rewriter-text"
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                        placeholder="Paste or write the section text to rewrite — e.g. a experience bullet like “Worked on the payments team”…"
                        rows={6}
                        maxLength={MAX_CHARS}
                        disabled={generating}
                        aria-invalid={tooShort}
                        className={cn(
                          'min-h-[120px] resize-y border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600',
                          tooShort && 'border-rose-400/50 focus-visible:ring-rose-400/40',
                        )}
                      />
                      <div className="flex items-center justify-between gap-3 text-xs">
                        {trimmedLen === 0 ? (
                          <span className="text-slate-500">Write at least 10 characters.</span>
                        ) : tooShort ? (
                          <span className="flex items-center gap-1 text-rose-400">
                            <CircleAlert className="h-3.5 w-3.5" aria-hidden /> Write at least 10 characters.
                          </span>
                        ) : (
                          <span className="text-slate-500">Looks good — ready to rewrite.</span>
                        )}
                        <span className={cn('tabular-nums', text.length >= MAX_CHARS ? 'text-amber-400' : 'text-slate-600')}>
                          {text.length}/{MAX_CHARS}
                        </span>
                      </div>
                    </div>

                    {/* Mode picker */}
                    <div className="space-y-2">
                      <Label className="text-slate-300">Rewrite mode</Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Rewrite mode">
                        {REWRITE_MODES.map((m) => (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => setSelectedMode(m.key)}
                            aria-pressed={selectedMode === m.key}
                            disabled={generating}
                            className={cn(
                              'min-h-[44px] rounded-lg border px-2 py-2 text-xs font-medium transition-all duration-200',
                              selectedMode === m.key
                                ? 'border-violet-400/40 bg-violet-500/15 text-violet-200 shadow-[0_0_18px_-6px_rgba(139,92,246,0.6)]'
                                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white',
                            )}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-cyan-300">
                        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span>
                          <span className="font-medium">{activeMode.label}:</span> {activeMode.hint}
                        </span>
                      </p>
                    </div>

                    {error && (
                      <p className="flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {error}
                      </p>
                    )}

                    <LoadingButton
                      loading={generating}
                      loadingText="Generating rewrites…"
                      onClick={generate}
                      disabled={trimmedLen < MIN_CHARS}
                      className="min-h-[44px] w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
                    >
                      <Wand2 className="h-4 w-4" aria-hidden /> Generate rewrites
                    </LoadingButton>
                  </CardContent>
                </Card>
              </Tilt3D>
            </Rise3D>

            {/* ── Right column: variants ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">AI variants</h2>
                {(variants.length > 0 || error) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generate}
                    disabled={generating || trimmedLen < MIN_CHARS}
                    className="min-h-[40px] border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', generating && 'animate-spin')} aria-hidden /> Regenerate
                  </Button>
                )}
              </div>

              {generating ? (
                <div className="space-y-4" aria-live="polite" aria-busy="true">
                  <VariantSkeleton />
                  <VariantSkeleton />
                  <VariantSkeleton />
                </div>
              ) : variants.length > 0 ? (
                <div className="space-y-4 transition-opacity duration-300" aria-live="polite">
                  {variants.map((variant, i) => (
                    <Rise3D key={i} delay={i * 0.06} className="h-full">
                      <Tilt3D className="h-full" max={3}>
                        <Card className={cn('h-full', GLASS)}>
                          <CardContent className="space-y-3 p-4">
                            <div className="flex items-center justify-between gap-2">
                              <Badge className="border-transparent bg-violet-500/15 text-violet-200">
                                Variant {i + 1}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyVariant(variant)}
                                aria-label={`Copy variant ${i + 1} to clipboard`}
                                className="min-h-[40px] border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                              >
                                <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
                              </Button>
                            </div>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{variant}</p>
                          </CardContent>
                        </Card>
                      </Tilt3D>
                    </Rise3D>
                  ))}
                </div>
              ) : (
                /* Empty state: before first generation */
                <Rise3D delay={0.06}>
                  <Card className={cn('border-dashed', GLASS)}>
                    <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                      <Float3D duration={5} wobble={3}>
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15 text-violet-300 shadow-[0_0_30px_-8px_rgba(139,92,246,0.6)]"
                          aria-hidden
                        >
                          <Wand2 className="h-7 w-7" />
                        </span>
                      </Float3D>
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-white">Your rewritten sections appear here</h3>
                        <p className="mx-auto max-w-sm text-sm text-slate-400">
                          Write or paste a section on the left, pick a mode — then generate 3 AI variants to copy from.
                          Try “Add Action Verbs” for bullet points or “Make ATS-Friendly” for keyword-rich text.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Rise3D>
              )}
            </div>
          </div>
        )}
      </div>

      <NewResumeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  );
}
