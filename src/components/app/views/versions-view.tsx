'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { LoadingButton } from '@/components/app/loading-button';
import { Float3D, Rise3D, Tilt3D } from '@/components/app/three-d/motion';
import { apiFetch } from '@/lib/client/api';
import { navigate } from '@/lib/client/navigation';
import { useResumesStore, type ResumeSummary } from '@/stores/resumes-store';
import { normalizeResumeData, type ResumeData } from '@/types/resume';
import { computeQualityScore, computeResumeCompletion } from '@/lib/scores';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  History,
  Save,
  Undo2,
  GitCompare,
  Files,
  Clock,
  Info,
  RefreshCw,
  CircleAlert,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GLASS = 'border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';

interface VersionRow {
  id: string;
  label: string;
  createdAt: string;
  /** Stored JSON snapshot of the resume — `null` right after saving, backfilled by the list refresh. */
  data: unknown;
}

interface ResumeStats {
  skills: number;
  experience: number;
  projects: number;
  bullets: number;
  summaryLength: number;
  completion: number;
  quality: number;
}

const METRICS: { key: keyof ResumeStats; label: string }[] = [
  { key: 'skills', label: 'Skills' },
  { key: 'experience', label: 'Experience entries' },
  { key: 'projects', label: 'Projects' },
  { key: 'bullets', label: 'Bullet points' },
  { key: 'summaryLength', label: 'Summary length' },
  { key: 'completion', label: 'Completion' },
  { key: 'quality', label: 'Quality score' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Deterministic stats for a stored resume snapshot. */
function computeStats(raw: unknown): ResumeStats {
  const d = normalizeResumeData(raw);
  const bullets = [...d.experience, ...d.internships, ...d.projects].reduce(
    (acc, e) => acc + e.description.split('\n').filter((l) => l.trim()).length,
    0,
  );
  return {
    skills: Object.values(d.skills).reduce((acc, arr) => acc + arr.length, 0),
    experience: d.experience.length,
    projects: d.projects.length,
    bullets,
    summaryLength: d.summary.trim().length,
    completion: computeResumeCompletion(d),
    quality: computeQualityScore(d),
  };
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
        <TrendingUp className="h-3 w-3" aria-hidden /> +{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400">
        <TrendingDown className="h-3 w-3" aria-hidden /> {delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-slate-500">
      <Minus className="h-3 w-3" aria-hidden /> same
    </span>
  );
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

/** Resume Version Manager — snapshot, compare and restore resume content. */
export function VersionsView({ preselectedId }: { preselectedId?: string }) {
  const resumes = useResumesStore((s) => s.resumes);
  const resumesLoaded = useResumesStore((s) => s.loaded);
  const loadingResumes = useResumesStore((s) => s.loading);
  const fetchResumes = useResumesStore((s) => s.fetch);

  const [selectedId, setSelectedId] = useState('');
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [currentData, setCurrentData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<VersionRow | null>(null);
  const [compareTarget, setCompareTarget] = useState<VersionRow | null>(null);
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

  /** Loads the version list and the current resume content in parallel. */
  const loadAll = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [v, d] = await Promise.all([
        apiFetch<{ versions: VersionRow[] }>(`/api/resumes/${id}/versions`),
        apiFetch<{ data: ResumeData }>(`/api/resumes/${id}`),
      ]);
      setVersions(v.versions);
      setCurrentData(d.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadAll(selectedId);
    } else {
      setVersions([]);
      setCurrentData(null);
    }
  }, [selectedId, loadAll]);

  const noResumes = (resumesLoaded && resumes.length === 0) || fetchFailed;
  const selectedResume = resumes.find((r) => r.id === selectedId) ?? null;

  const saveSnapshot = async (useLabel = true) => {
    if (!selectedId || saving) return;
    setSaving(true);
    try {
      const trimmed = label.trim();
      const { version } = await apiFetch<{ version: { id: string; label: string; createdAt: string } }>(
        `/api/resumes/${selectedId}/versions`,
        { method: 'POST', json: useLabel && trimmed ? { label: trimmed } : {} },
      );
      // Prepend immediately, then backfill the stored data so Compare works on the new row too.
      setVersions((vs) => [{ ...version, data: null }, ...vs]);
      if (useLabel) setLabel('');
      toast.success(`Snapshot saved — ${version.label}`);
      const { versions: fresh } = await apiFetch<{ versions: VersionRow[] }>(`/api/resumes/${selectedId}/versions`);
      setVersions(fresh);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const restore = async (target: VersionRow) => {
    if (!selectedId || restoringId) return;
    setRestoringId(target.id);
    try {
      await apiFetch(`/api/resumes/${selectedId}/versions/${target.id}/restore`, { method: 'POST' });
      toast.success(`Restored “${target.label}”.`);
      await loadAll(selectedId);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRestoringId(null);
      setRestoreTarget(null);
    }
  };

  const compareSnapshot = useMemo(
    () => (compareTarget && compareTarget.data != null ? computeStats(compareTarget.data) : null),
    [compareTarget],
  );
  const compareCurrent = useMemo(() => (currentData ? computeStats(currentData) : null), [currentData]);

  return (
    <AppShell active="versions">
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"
            aria-hidden
          >
            <History className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">Resume Versions</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Snapshot your resume at key moments, compare how it evolved and restore earlier content safely.
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
                    Create a resume and fill it in — then save snapshots here to track every version of your story.
                  </p>
                </div>
                <Button
                  className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
                  onClick={() => navigate('resumes')}
                >
                  <Files className="h-4 w-4" aria-hidden /> Go to My Resumes
                </Button>
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
                    id="versions-resume"
                    label="Choose a resume"
                    value={selectedId}
                    onChange={(id) => setSelectedId(id)}
                    resumes={resumes}
                    loading={loadingResumes}
                    placeholder="Select the resume to manage versions for"
                  />
                </CardContent>
              </Card>
            </Rise3D>

            {selectedId && (
              <>
                {/* Toolbar */}
                <Rise3D delay={0.06}>
                  <Card className={GLASS}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base text-slate-100">
                        Save a snapshot
                        {selectedResume && (
                          <Badge variant="outline" className="border-white/10 text-slate-400">
                            {selectedResume.title}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Snapshots capture the resume exactly as it was when saved.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-1.5">
                          <Label htmlFor="version-label" className="text-slate-300">
                            Snapshot label (optional)
                          </Label>
                          <Input
                            id="version-label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="e.g. Software Developer Resume"
                            maxLength={80}
                            disabled={saving}
                            className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveSnapshot();
                            }}
                          />
                        </div>
                        <LoadingButton
                          loading={saving}
                          loadingText="Saving snapshot…"
                          onClick={() => saveSnapshot()}
                          className="min-h-[44px] w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 sm:w-auto"
                        >
                          <Save className="h-4 w-4" aria-hidden /> Save snapshot
                        </LoadingButton>
                      </div>
                    </CardContent>
                  </Card>
                </Rise3D>

                {/* Version list */}
                {loading ? (
                  <div className="space-y-3" aria-busy="true">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className={cn('h-20 animate-pulse rounded-xl', GLASS)} aria-hidden />
                    ))}
                  </div>
                ) : error ? (
                  <Card className={cn(GLASS, 'border-rose-400/20')}>
                    <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                      <CircleAlert className="h-6 w-6 text-rose-400" aria-hidden />
                      <p className="text-sm text-rose-400">{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadAll(selectedId)}
                        className="min-h-[40px] border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden /> Retry
                      </Button>
                    </CardContent>
                  </Card>
                ) : versions.length === 0 ? (
                  /* Empty state: no versions yet */
                  <Card className={cn('border-dashed', GLASS)}>
                    <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                      <Float3D duration={5} wobble={3}>
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15 text-violet-300 shadow-[0_0_30px_-8px_rgba(139,92,246,0.6)]"
                          aria-hidden
                        >
                          <History className="h-7 w-7" />
                        </span>
                      </Float3D>
                      <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-white">No versions yet.</h2>
                        <p className="mx-auto max-w-md text-sm text-slate-400">
                          Snapshots capture the resume exactly as it was when saved — so you can always get an earlier
                          draft back.
                        </p>
                      </div>
                      <LoadingButton
                        loading={saving}
                        loadingText="Saving…"
                        onClick={() => saveSnapshot(false)}
                        className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
                      >
                        <Save className="h-4 w-4" aria-hidden /> Save the first snapshot
                      </LoadingButton>
                    </CardContent>
                  </Card>
                ) : (
                  <Rise3D delay={0.1}>
                    <Card className={GLASS}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                          Saved versions
                          <Badge className="border-transparent bg-violet-500/15 text-violet-200">{versions.length}</Badge>
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          Restoring replaces the current content with the snapshot.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
                          {versions.map((v) => (
                            <div
                              key={v.id}
                              className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-100" title={v.label}>
                                  {v.label}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                  <Clock className="h-3 w-3" aria-hidden /> Saved {timeAgo(v.createdAt)}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCompareTarget(v)}
                                  aria-label={`Compare “${v.label}” with the current content`}
                                  className="min-h-[40px] border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                                >
                                  <GitCompare className="h-3.5 w-3.5" aria-hidden /> Compare
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRestoreTarget(v)}
                                  disabled={restoringId === v.id}
                                  aria-label={`Restore “${v.label}”`}
                                  className="min-h-[40px] border-violet-400/20 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 hover:text-violet-100"
                                >
                                  {restoringId === v.id ? (
                                    <>
                                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" aria-hidden />
                                      Restoring…
                                    </>
                                  ) : (
                                    <>
                                      <Undo2 className="h-3.5 w-3.5" aria-hidden /> Restore
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Rise3D>
                )}

                {/* Hint strip */}
                <p className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-slate-400 backdrop-blur-xl">
                  <Info className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
                  Snapshots capture the resume exactly as it was when saved.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Restore confirmation */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent className="border-white/[0.08] bg-[#0a0e1f]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              Restore “{restoreTarget?.label ?? ''}”?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Restoring replaces the current resume content with this snapshot. The current content is not auto-saved —
              save a snapshot first if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreTarget && restore(restoreTarget)}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
            >
              <Undo2 className="h-4 w-4" aria-hidden /> Restore this version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compare dialog: snapshot vs current */}
      <Dialog open={!!compareTarget} onOpenChange={(o) => !o && setCompareTarget(null)}>
        <DialogContent className="border-white/[0.08] bg-[#0a0e1f] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <GitCompare className="h-4 w-4 text-violet-300" aria-hidden /> Snapshot vs current
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {compareTarget?.label ?? ''} — saved {compareTarget ? timeAgo(compareTarget.createdAt) : ''}. Deltas show
              how the snapshot differs from the current content.
            </DialogDescription>
          </DialogHeader>

          {compareTarget && compareTarget.data == null ? (
            <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
              Snapshot contents are still loading — close and reopen in a moment.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
                <span className="justify-self-end rounded-full bg-violet-500/15 px-2.5 py-1 font-medium text-violet-200">
                  Snapshot
                </span>
                <span />
                <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 font-medium text-cyan-200">Current</span>
              </div>

              {METRICS.map((m) => {
                const a = compareSnapshot ? compareSnapshot[m.key] : 0;
                const b = compareCurrent ? compareCurrent[m.key] : 0;
                return (
                  <div
                    key={m.key}
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/[0.05] pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="justify-self-end text-lg font-semibold tabular-nums text-white">{a}</span>
                    <div className="flex w-28 flex-col items-center gap-1">
                      <span className="text-center text-[11px] uppercase tracking-wide text-slate-500">{m.label}</span>
                      <DeltaBadge delta={a - b} />
                    </div>
                    <span className="text-lg font-semibold tabular-nums text-white">{b}</span>
                  </div>
                );
              })}

              <p className="text-xs leading-relaxed text-slate-500">
                Completion and quality are deterministic 0–100 scores — the same content always scores the same.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
