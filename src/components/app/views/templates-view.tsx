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
import { ResumePreview } from '@/components/resume/resume-preview';
import { hasAnyContent } from '@/components/resume/templates/shared';
import { TEMPLATE_LABELS, emptyResumeData, type ResumeData, type ResumeTemplate } from '@/types/resume';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LayoutTemplate,
  Files,
  FilePlus2,
  Check,
  Info,
  RefreshCw,
  CircleAlert,
  MousePointerClick,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GLASS = 'border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';

const TEMPLATE_INFO: Record<ResumeTemplate, string> = {
  modern: 'Single-column, keyword-optimized layout — best all-round ATS performance',
  professional: 'Classic serif styling for corporate, finance and senior roles',
  minimal: 'Clean and understated, maximum whitespace',
};

const ALL_TEMPLATES = Object.keys(TEMPLATE_LABELS) as ResumeTemplate[];

interface ResumeDetail {
  resume: {
    id: string;
    title: string;
    targetRole: string | null;
    template: ResumeTemplate;
    createdAt: string;
    updatedAt: string;
  };
  data: ResumeData;
}

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
      <label htmlFor={id} className="text-sm text-slate-300">
        {label}
      </label>
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

/** Scaled live A4 thumbnail of a template. */
function TemplateThumb({ data, template }: { data: ResumeData; template: ResumeTemplate }) {
  return (
    <div className="relative aspect-[210/297] overflow-hidden rounded-lg bg-white ring-1 ring-white/10">
      <div className="pointer-events-none w-[357%] origin-top-left scale-[0.28]">
        <ResumePreview data={data} template={template} className="shadow-none ring-0" />
      </div>
    </div>
  );
}

/** Resume Templates — switch the template of a resume with live previews. */
export function TemplatesView() {
  const resumes = useResumesStore((s) => s.resumes);
  const resumesLoaded = useResumesStore((s) => s.loaded);
  const loadingResumes = useResumesStore((s) => s.loading);
  const fetchResumes = useResumesStore((s) => s.fetch);

  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<ResumeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<ResumeTemplate>('modern');
  const [applying, setApplying] = useState<ResumeTemplate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    if (!useResumesStore.getState().loaded) {
      fetchResumes(true).catch((e: unknown) => {
        setFetchFailed(true);
        toast.error((e as Error).message);
      });
    }
  }, [fetchResumes]);

  const loadDetail = useCallback(async (id: string, silent = false) => {
    if (!silent) {
      setLoadingDetail(true);
      setDetailError(null);
    }
    try {
      const d = await apiFetch<ResumeDetail>(`/api/resumes/${id}`);
      setDetail(d);
      setHighlighted(d.resume.template);
    } catch (e) {
      toast.error((e as Error).message);
      if (!silent) setDetailError((e as Error).message);
    } finally {
      if (!silent) setLoadingDetail(false);
    }
  }, []);

  // Fetch the selected resume's full data.
  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetail(null);
      setDetailError(null);
    }
  }, [selectedId, loadDetail]);

  const noResumes = (resumesLoaded && resumes.length === 0) || fetchFailed;

  const apply = async (t: ResumeTemplate) => {
    if (!detail || detail.resume.template === t || applying) return;
    setApplying(t);
    try {
      const { resume } = await apiFetch<{ resume: { id: string; template: ResumeTemplate } }>(
        `/api/resumes/${detail.resume.id}`,
        { method: 'PUT', json: { template: t } },
      );
      toast.success('Template applied');
      setHighlighted(t);
      useResumesStore.setState((s) => ({
        resumes: s.resumes.map((r) => (r.id === resume.id ? { ...r, template: resume.template } : r)),
      }));
      // Refetch the detail so everything stays in sync with the server.
      await loadDetail(detail.resume.id, true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setApplying(null);
    }
  };

  const previewData = detail?.data ?? emptyResumeData();
  const emptyResume = detail ? !hasAnyContent(detail.data) : false;

  return (
    <AppShell active="templates">
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"
            aria-hidden
          >
            <LayoutTemplate className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">Resume Templates</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Pick the template that fits your story — every template stays ATS-parseable and export-identical.
            </p>
          </div>
        </header>

        {noResumes ? (
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
                    Create a resume first — then come back here to switch its template with a live preview.
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
                </div>
              </CardContent>
            </Card>
          </Rise3D>
        ) : (
          <div className="space-y-6">
            {/* Resume selector */}
            <Rise3D>
              <Card className={GLASS}>
                <CardContent className="p-4 sm:p-5">
                  <ResumeSelect
                    id="templates-resume"
                    label="Choose a resume"
                    value={selectedId}
                    onChange={(id) => setSelectedId(id)}
                    resumes={resumes}
                    loading={loadingResumes}
                    placeholder="Select the resume to restyle"
                  />
                </CardContent>
              </Card>
            </Rise3D>

            {!selectedId ? (
              /* No resume picked yet */
              <Card className={cn('border-dashed', GLASS)}>
                <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                  <Float3D duration={5} wobble={3}>
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300"
                      aria-hidden
                    >
                      <MousePointerClick className="h-7 w-7" />
                    </span>
                  </Float3D>
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-white">Select a resume to preview its template</h2>
                    <p className="mx-auto max-w-md text-sm text-slate-400">
                      You&apos;ll see a live preview of your content in all three templates, side by side.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : loadingDetail ? (
              /* Loading skeleton */
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={cn('h-80 animate-pulse rounded-xl', GLASS)} aria-hidden />
                  ))}
                </div>
                <div className={cn('h-[520px] animate-pulse rounded-xl', GLASS)} aria-hidden />
              </div>
            ) : detailError || !detail ? (
              /* Error state with retry */
              <Card className={cn(GLASS, 'border-rose-400/20')}>
                <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                  <CircleAlert className="h-6 w-6 text-rose-400" aria-hidden />
                  <p className="text-sm text-rose-400">{detailError ?? 'Something went wrong loading this resume.'}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadDetail(selectedId)}
                    className="min-h-[40px] border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden /> Retry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
                  {/* Template gallery */}
                  <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-3">
                    {ALL_TEMPLATES.map((t, i) => {
                      const isCurrent = detail.resume.template === t;
                      const isActive = highlighted === t;
                      return (
                        <Rise3D key={t} delay={i * 0.06} className="h-full">
                          <Tilt3D className="h-full" max={3}>
                            <Card
                              className={cn(
                                'h-full transition-shadow',
                                GLASS,
                                isActive && 'shadow-[0_0_28px_-10px_rgba(139,92,246,0.65)] ring-1 ring-violet-400/40',
                              )}
                            >
                              <CardContent className="space-y-3 p-4">
                                <button
                                  type="button"
                                  onClick={() => setHighlighted(t)}
                                  aria-pressed={isActive}
                                  aria-label={`Preview the ${TEMPLATE_LABELS[t]} template`}
                                  className="block w-full rounded-lg text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                                >
                                  <TemplateThumb data={previewData} template={t} />
                                </button>
                                <div className="flex min-h-[1.75rem] items-center justify-between gap-2">
                                  <h3 className="text-sm font-semibold text-slate-100">{TEMPLATE_LABELS[t]}</h3>
                                  {isCurrent && (
                                    <Badge className="border-transparent bg-violet-500/15 text-violet-200">
                                      <Check className="h-3 w-3" aria-hidden /> Current
                                    </Badge>
                                  )}
                                </div>
                                <p className="min-h-[3.75rem] text-xs leading-relaxed text-slate-400">
                                  {TEMPLATE_INFO[t]}
                                </p>
                                {isCurrent ? (
                                  <Button
                                    variant="outline"
                                    disabled
                                    aria-label={`${TEMPLATE_LABELS[t]} is the current template`}
                                    className="min-h-[44px] w-full border-white/10 bg-white/[0.03] text-slate-400"
                                  >
                                    <Check className="h-4 w-4" aria-hidden /> Current template
                                  </Button>
                                ) : (
                                  <LoadingButton
                                    loading={applying === t}
                                    loadingText="Applying…"
                                    variant="outline"
                                    onClick={() => apply(t)}
                                    aria-label={`Apply the ${TEMPLATE_LABELS[t]} template`}
                                    className="min-h-[44px] w-full border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                                  >
                                    Apply template
                                  </LoadingButton>
                                )}
                              </CardContent>
                            </Card>
                          </Tilt3D>
                        </Rise3D>
                      );
                    })}
                  </div>

                  {/* Large live preview */}
                  <Rise3D delay={0.1} className="h-full">
                    <Card className={cn('h-full', GLASS)}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base text-slate-100">
                          Live preview
                          <Badge className="border-transparent bg-violet-500/15 text-violet-200">
                            {TEMPLATE_LABELS[highlighted]}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          {detail.resume.title} rendered in the {TEMPLATE_LABELS[highlighted]} template.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="overflow-hidden rounded-lg ring-1 ring-white/10">
                          <ResumePreview data={previewData} template={highlighted} />
                        </div>
                        {emptyResume && (
                          <p className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300">
                            This resume has no content yet — add details in the builder to see a real preview.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Rise3D>
                </div>

                {/* Note strip */}
                <p className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-slate-400 backdrop-blur-xl">
                  <Info className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
                  All templates are single-column, ATS-parseable and export-identical in PDF.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <NewResumeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  );
}
