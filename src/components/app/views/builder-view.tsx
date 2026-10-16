'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch, downloadFile } from '@/lib/client/api';
import { navigate } from '@/lib/client/navigation';
import { LoadingButton } from '@/components/app/loading-button';
import { LatexDialog } from '@/components/app/latex-dialog';
import { ResumePreview } from '@/components/resume/resume-preview';
import { FlipIn3D, Rise3D, Tilt3D } from '@/components/app/three-d/motion';
import { StepPersonal, StepSummary, StepEducation } from '@/components/app/builder/steps-basic';
import { StepSkills } from '@/components/app/builder/steps-skills';
import { StepExperience, StepInternships, StepProjects } from '@/components/app/builder/steps-history';
import { StepCertifications, StepAchievements, StepLanguages } from '@/components/app/builder/steps-extra';
import { normalizeResumeData, TARGET_ROLES, TEMPLATE_LABELS, type ResumeData, type ResumeTemplate } from '@/types/resume';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Check,
  CircleDot,
  CloudUpload,
  Code2,
  Download,
  FileText,
  FolderGit2,
  Gauge,
  GraduationCap,
  History,
  Languages,
  Loader2,
  Target,
  Trophy,
  User,
  Wand2,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'personal', title: 'Personal Info', icon: User },
  { key: 'summary', title: 'Summary', icon: FileText },
  { key: 'education', title: 'Education', icon: GraduationCap },
  { key: 'skills', title: 'Skills', icon: Wrench },
  { key: 'experience', title: 'Experience', icon: Briefcase },
  { key: 'internships', title: 'Internships', icon: BookOpen },
  { key: 'projects', title: 'Projects', icon: FolderGit2 },
  { key: 'certifications', title: 'Certifications', icon: Award },
  { key: 'achievements', title: 'Achievements', icon: Trophy },
  { key: 'languages', title: 'Languages', icon: Languages },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

interface VersionItem {
  id: string;
  label: string;
  createdAt: string;
}

export function BuilderView({ resumeId }: { resumeId: string }) {
  const [data, setData] = useState<ResumeData | null>(null);
  const [title, setTitle] = useState('Untitled Resume');
  const [targetRole, setTargetRole] = useState('');
  const [template, setTemplate] = useState<ResumeTemplate>('modern');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [step, setStep] = useState<StepKey>('personal');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [latexOpen, setLatexOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');
  const [versionBusy, setVersionBusy] = useState(false);

  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ resume: { title: string; targetRole: string | null; template: ResumeTemplate }; data: unknown }>(
      `/api/resumes/${resumeId}`,
    )
      .then((res) => {
        if (cancelled) return;
        setData(normalizeResumeData(res.data));
        setTitle(res.resume.title);
        setTargetRole(res.resume.targetRole ?? '');
        setTemplate(res.resume.template);
        loadedRef.current = true;
        setLoading(false);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setLoadError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  // ── Autosave (debounced) ────────────────────────────────────────────────
  const saveNow = useCallback(
    async (announce = false) => {
      if (!data) return;
      setSaveState('saving');
      try {
        await apiFetch(`/api/resumes/${resumeId}`, {
          method: 'PUT',
          json: {
            title: title.trim() || 'Untitled Resume',
            targetRole: targetRole.trim() || null,
            template,
            data,
          },
        });
        setSaveState('saved');
        if (announce) toast.success('Resume saved.');
      } catch (e) {
        setSaveState('unsaved');
        toast.error((e as Error).message);
      }
    },
    [data, title, targetRole, template, resumeId],
  );

  useEffect(() => {
    if (!loadedRef.current || !data) return;
    setSaveState('unsaved');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNow(false);
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, title, targetRole, template, saveNow]);

  const update = useCallback((patch: Partial<ResumeData>) => {
    setData((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const aiContext = useMemo(() => {
    if (!data) return '';
    const bits = [
      data.personal.professionalTitle,
      data.personal.location,
      ...data.skills.languages.slice(0, 6),
      ...data.skills.frameworks.slice(0, 6),
      ...data.education.slice(0, 2).map((e) => e.degree),
      ...data.experience.slice(0, 2).map((e) => `${e.jobTitle} at ${e.company}`),
    ].filter(Boolean);
    return bits.length ? `Candidate profile: ${bits.join(', ')}` : '';
  }, [data]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      await saveNow(false);
      await downloadFile(`/api/resumes/${resumeId}/pdf`, `${title || 'resume'}.pdf`);
      toast.success('PDF downloaded.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPdfBusy(false);
    }
  };

  const saveVersion = async () => {
    setVersionBusy(true);
    try {
      await saveNow(false);
      await apiFetch(`/api/resumes/${resumeId}/versions`, {
        method: 'POST',
        json: { label: versionLabel.trim() || undefined },
      });
      toast.success('Version saved. Restore it anytime from the Versions list.');
      setVersionLabel('');
      setVersionsOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setVersionBusy(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm">Loading builder…</p>
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="max-w-md p-6 text-center">
          <p className="font-semibold">Could not open this resume.</p>
          <p className="mt-1 text-sm text-muted-foreground">{loadError || 'It may have been deleted.'}</p>
          <Button className="mt-4 min-h-[44px]" onClick={() => navigate('dashboard')}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const stepProps = { data, update, targetRole: targetRole.trim() || undefined, context: aiContext };
  const CurrentStep = () => {
    switch (step) {
      case 'personal':
        return <StepPersonal {...stepProps} />;
      case 'summary':
        return <StepSummary {...stepProps} />;
      case 'education':
        return <StepEducation {...stepProps} />;
      case 'skills':
        return <StepSkills {...stepProps} />;
      case 'experience':
        return <StepExperience {...stepProps} />;
      case 'internships':
        return <StepInternships {...stepProps} />;
      case 'projects':
        return <StepProjects {...stepProps} />;
      case 'certifications':
        return <StepCertifications {...stepProps} />;
      case 'achievements':
        return <StepAchievements {...stepProps} />;
      case 'languages':
        return <StepLanguages {...stepProps} />;
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const isDone = (key: StepKey): boolean => {
    switch (key) {
      case 'personal':
        return Boolean(data.personal.fullName.trim());
      case 'summary':
        return Boolean(data.summary.trim() || data.objective.trim());
      case 'education':
        return data.education.length > 0;
      case 'skills':
        return Object.values(data.skills).some((a) => a.length > 0);
      case 'experience':
        return data.experience.length > 0;
      case 'internships':
        return data.internships.length > 0;
      case 'projects':
        return data.projects.length > 0;
      case 'certifications':
        return data.certifications.length > 0;
      case 'achievements':
        return data.achievements.length > 0;
      case 'languages':
        return data.languages.length > 0;
    }
  };

  const roleOptions = [...new Set([...TARGET_ROLES, ...(targetRole.trim() ? [targetRole.trim()] : [])])];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" size="icon" className="min-h-[40px] min-w-[40px]" onClick={() => navigate('dashboard')} aria-label="Back to dashboard">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Button>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 w-44 min-w-0 flex-1 font-semibold sm:w-56"
            aria-label="Resume name"
            maxLength={80}
          />
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs',
              saveState === 'saved' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
              saveState === 'unsaved' && 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
              saveState === 'saving' && 'bg-muted text-muted-foreground',
            )}
            aria-live="polite"
          >
            {saveState === 'saved' && (
              <>
                <CloudUpload className="h-3.5 w-3.5" aria-hidden /> Saved
              </>
            )}
            {saveState === 'unsaved' && (
              <>
                <CircleDot className="h-3.5 w-3.5" aria-hidden /> Unsaved changes
              </>
            )}
            {saveState === 'saving' && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Saving…
              </>
            )}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={template} onValueChange={(v) => setTemplate(v as ResumeTemplate)}>
              <SelectTrigger className="h-9 w-40" aria-label="Resume template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TEMPLATE_LABELS) as ResumeTemplate[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TEMPLATE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <LoadingButton variant="outline" size="sm" className="min-h-[36px]" loading={false} onClick={() => setVersionsOpen(true)}>
              <History className="h-4 w-4" aria-hidden /> Versions
            </LoadingButton>
            <Button variant="outline" size="sm" className="min-h-[36px]" onClick={() => navigate('analyzer', resumeId)}>
              <Gauge className="h-4 w-4" aria-hidden /> Analyze
            </Button>
            <Button variant="outline" size="sm" className="min-h-[36px]" onClick={() => setLatexOpen(true)}>
              <Code2 className="h-4 w-4" aria-hidden /> LaTeX
            </Button>
            <LoadingButton size="sm" className="min-h-[36px]" loading={pdfBusy} loadingText="Creating PDF…" onClick={downloadPdf}>
              <Download className="h-4 w-4" aria-hidden /> PDF
            </LoadingButton>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,44%)]">
        {/* ── Editor column ── */}
        <div className="min-w-0 space-y-4">
          {/* Target job role */}
          <Rise3D>
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                <Target className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <Label htmlFor="target-role" className="text-sm font-semibold">
                  Target Job Role
                </Label>
                <p className="mb-2 text-xs text-muted-foreground">The AI tailors wording to this role. Pick a suggestion or type your own.</p>
                <Input
                  id="target-role"
                  list="target-role-options"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Software Developer"
                  maxLength={80}
                />
                <datalist id="target-role-options">
                  {roleOptions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
            </div>
          </Card>
          </Rise3D>

          {/* Step chips */}
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Builder steps">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = step === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStep(s.key)}
                  className={cn(
                    'flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200',
                    active
                      ? 'border-teal-600 bg-teal-600 text-white shadow-md shadow-teal-600/25'
                      : 'border-input bg-background text-muted-foreground hover:-translate-y-0.5 hover:bg-muted hover:text-foreground',
                  )}
                >
                  {isDone(s.key) && !active ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                  ) : (
                    <span className={cn('text-xs', active ? 'text-white/80' : 'text-muted-foreground/70')}>{i + 1}</span>
                  )}
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {s.title}
                </button>
              );
            })}
          </div>

          {/* Current step */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                {(() => {
                  const Icon = STEPS[stepIndex].icon;
                  return <Icon className="h-5 w-5 text-teal-600" aria-hidden />;
                })()}
                Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex].title}
              </h2>
            </div>
            <FlipIn3D switchKey={step}>
              <CurrentStep />
            </FlipIn3D>

            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <Button variant="outline" className="min-h-[44px]" onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)].key)} disabled={stepIndex === 0}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </Button>
              <span className="text-xs text-muted-foreground">Changes save automatically</span>
              <Button className="min-h-[44px]" onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)].key)} disabled={stepIndex === STEPS.length - 1}>
                Next <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Preview column (below editor on mobile, sticky right on desktop) ── */}
        <Rise3D className="min-w-0 lg:sticky lg:top-20 lg:self-start" distance={20} tilt={5}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Wand2 className="h-4 w-4 text-teal-600" aria-hidden /> Live Preview
            </h2>
            <span className="text-xs text-muted-foreground">{TEMPLATE_LABELS[template]}</span>
          </div>
          <div className="lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:rounded-xl lg:pr-1">
            <Tilt3D max={2.5}>
              <ResumePreview data={data} template={template} />
            </Tilt3D>
          </div>
        </Rise3D>
      </div>

      <LatexDialog resumeId={resumeId} open={latexOpen} onOpenChange={setLatexOpen} />

      {/* Versions dialog */}
      <VersionsDialog
        resumeId={resumeId}
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        versionLabel={versionLabel}
        setVersionLabel={setVersionLabel}
        versionBusy={versionBusy}
        onSaveNew={saveVersion}
        onRestore={async (versionId) => {
          try {
            const res = await apiFetch<{ restored: boolean }>(`/api/resumes/${resumeId}/versions/${versionId}/restore`, { method: 'POST' });
            if (res.restored) {
              const fresh = await apiFetch<{ resume: { title: string; targetRole: string | null; template: ResumeTemplate }; data: unknown }>(`/api/resumes/${resumeId}`);
              setData(normalizeResumeData(fresh.data));
              setTitle(fresh.resume.title);
              toast.success('Version restored.');
              setVersionsOpen(false);
            }
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </div>
  );
}

function VersionsDialog({
  resumeId,
  open,
  onOpenChange,
  versionLabel,
  setVersionLabel,
  versionBusy,
  onSaveNew,
  onRestore,
}: {
  resumeId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  versionLabel: string;
  setVersionLabel: (v: string) => void;
  versionBusy: boolean;
  onSaveNew: () => void;
  onRestore: (versionId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-teal-600" aria-hidden /> Resume Versions
          </DialogTitle>
          <DialogDescription>
            Snapshot the current resume for a specific job application, or restore an earlier snapshot.
          </DialogDescription>
        </DialogHeader>
        {open && resumeId ? (
          <VersionsContent
            resumeId={resumeId}
            versionLabel={versionLabel}
            setVersionLabel={setVersionLabel}
            versionBusy={versionBusy}
            onSaveNew={onSaveNew}
            onRestore={onRestore}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function VersionsContent({
  resumeId,
  versionLabel,
  setVersionLabel,
  versionBusy,
  onSaveNew,
  onRestore,
}: {
  resumeId: string;
  versionLabel: string;
  setVersionLabel: (v: string) => void;
  versionBusy: boolean;
  onSaveNew: () => void;
  onRestore: (versionId: string) => void;
}) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ versions: VersionItem[] }>(`/api/resumes/${resumeId}/versions`)
      .then((r) => {
        if (!cancelled) setVersions(r.versions);
      })
      .catch(() => {
        if (!cancelled) setVersions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="version-label">Save current state as version</Label>
        <div className="flex gap-2">
          <Input
            id="version-label"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            placeholder="e.g. Infosys application — Jan 2025"
            maxLength={80}
          />
          <LoadingButton loading={versionBusy} loadingText="Saving…" onClick={onSaveNew} className="min-h-[44px] shrink-0">
            Save version
          </LoadingButton>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border" aria-label="Saved versions list">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading versions…</p>
        ) : versions.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No versions saved yet.</p>
        ) : (
          <ul className="divide-y">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{v.label}</p>
                  <p className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p>
                </div>
                <Button variant="outline" size="sm" className="min-h-[36px] shrink-0" onClick={() => onRestore(v.id)}>
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
