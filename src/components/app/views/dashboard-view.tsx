'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { useAuthStore } from '@/stores/auth-store';
import { useResumesStore, type ResumeSummary } from '@/stores/resumes-store';
import { navigate } from '@/lib/client/navigation';
import { apiFetch, downloadFile } from '@/lib/client/api';
import { NewResumeDialog } from '@/components/app/new-resume-dialog';
import { ViewResumeDialog } from '@/components/app/view-resume-dialog';
import { LoadingButton } from '@/components/app/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TEMPLATE_LABELS, type ResumeTemplate } from '@/types/resume';
import {
  Plus,
  MoreVertical,
  Pencil,
  Eye,
  Copy,
  Trash2,
  Download,
  Code2,
  Files,
  ScanSearch,
  BriefcaseBusiness,
  Sparkles,
  History,
  Gauge,
  FileText,
  FolderOpen,
} from 'lucide-react';

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

function ResumeCard({
  resume,
  onView,
  onDelete,
}: {
  resume: ResumeSummary;
  onView: (r: ResumeSummary) => void;
  onDelete: (r: ResumeSummary) => void;
}) {
  const duplicate = useResumesStore((s) => s.duplicate);
  const rename = useResumesStore((s) => s.rename);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(resume.title);
  const [renaming, setRenaming] = useState(false);
  const [latexBusy, setLatexBusy] = useState(false);

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      await downloadFile(`/api/resumes/${resume.id}/pdf`, `${resume.title}.pdf`);
      toast.success('PDF downloaded.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPdfBusy(false);
    }
  };

  const downloadLatex = async () => {
    setLatexBusy(true);
    try {
      await downloadFile(`/api/resumes/${resume.id}/latex`, `${resume.title}.tex`);
      toast.success('LaTeX file downloaded.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLatexBusy(false);
    }
  };

  return (
    <Card className="flex min-w-0 flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base" title={resume.title}>
              {resume.title}
            </CardTitle>
            <CardDescription className="mt-1">Updated {timeAgo(resume.updatedAt)}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="min-h-[40px] min-w-[40px] shrink-0" aria-label={`Actions for ${resume.title}`}>
                <MoreVertical className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('builder', resume.id)}>
                <Pencil className="h-4 w-4" aria-hidden /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onView(resume)}>
                <Eye className="h-4 w-4" aria-hidden /> View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await duplicate(resume.id);
                    toast.success('Resume duplicated.');
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <Copy className="h-4 w-4" aria-hidden /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setRenameValue(resume.title);
                  setRenameOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={downloadPdf} disabled={pdfBusy}>
                <Download className="h-4 w-4" aria-hidden /> {pdfBusy ? 'Creating PDF…' : 'Download PDF'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadLatex} disabled={latexBusy}>
                <Code2 className="h-4 w-4" aria-hidden /> {latexBusy ? 'Generating…' : 'Generate LaTeX'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(resume)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" aria-hidden /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex flex-wrap items-center gap-2">
        {resume.targetRole ? (
          <Badge variant="secondary" className="bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
            {resume.targetRole}
          </Badge>
        ) : (
          <Badge variant="outline">No target role</Badge>
        )}
        <Badge variant="outline">{TEMPLATE_LABELS[resume.template] ?? resume.template}</Badge>
        <span className="text-xs text-muted-foreground">{resume._count?.versions ?? 0} version{(resume._count?.versions ?? 0) === 1 ? '' : 's'}</span>
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" variant="outline" className="min-h-[36px]" onClick={() => onView(resume)}>
            <Eye className="h-3.5 w-3.5" aria-hidden /> View
          </Button>
          <Button size="sm" className="min-h-[36px]" onClick={() => navigate('builder', resume.id)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
          </Button>
        </div>
      </CardContent>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename resume</DialogTitle>
            <DialogDescription>Give this resume a descriptive name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rename-input">Resume name</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={80}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameValue.trim()) {
                  setRenaming(true);
                  rename(resume.id, renameValue.trim())
                    .then(() => {
                      toast.success('Renamed.');
                      setRenameOpen(false);
                    })
                    .catch((err: Error) => toast.error(err.message))
                    .finally(() => setRenaming(false));
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              loading={renaming}
              loadingText="Renaming…"
              disabled={!renameValue.trim()}
              onClick={() => {
                setRenaming(true);
                rename(resume.id, renameValue.trim())
                  .then(() => {
                    toast.success('Renamed.');
                    setRenameOpen(false);
                  })
                  .catch((err: Error) => toast.error(err.message))
                  .finally(() => setRenaming(false));
              }}
            >
              Save name
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function DashboardView({ section }: { section: 'overview' | 'resumes' }) {
  const user = useAuthStore((s) => s.user);
  const { resumes, loading, loaded, fetch } = useResumesStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResumeSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(!loaded);
  }, []);

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await useResumesStore.getState().remove(deleteTarget.id);
      toast.success('Resume deleted.');
      setDeleteTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const totalVersions = resumes.reduce((a, r) => a + (r._count?.versions ?? 0), 0);
  const totalAnalyses = resumes.reduce((a, r) => a + (r._count?.analyses ?? 0), 0);

  const stats = [
    { label: 'Total Resumes', value: resumes.length, icon: Files, hint: 'Resumes in your account' },
    { label: 'Saved Versions', value: totalVersions, icon: History, hint: 'Version snapshots' },
    { label: 'AI Analyses', value: totalAnalyses, icon: Gauge, hint: 'ATS + job match runs' },
  ];

  return (
    <AppShell active={section === 'resumes' ? 'resumes' : 'overview'}>
      {/* Welcome */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name?.split(' ')[0] ?? 'there'} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {section === 'overview'
              ? 'Create, improve and analyze your resumes with AI.'
              : 'All of your resumes, in one place.'}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="min-h-[44px]">
          <Plus className="h-4 w-4" aria-hidden /> Create New Resume
        </Button>
      </div>

      {section === 'overview' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label}>
                  <CardContent className="flex items-center gap-4 p-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-2xl font-bold leading-none">{s.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate('analyzer')}
              className="group flex min-h-[44px] items-center gap-4 rounded-xl border bg-card p-5 text-left transition-shadow hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
                <ScanSearch className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">AI Resume Analyzer</span>
                <span className="block text-sm text-muted-foreground">Get your AI Estimated ATS Score & fixes</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('jobmatch')}
              className="group flex min-h-[44px] items-center gap-4 rounded-xl border bg-card p-5 text-left transition-shadow hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <BriefcaseBusiness className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">Job Description Match</span>
                <span className="block text-sm text-muted-foreground">Paste a job posting, see how you match</span>
              </span>
            </button>
          </div>

          {/* Recent resumes */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent resumes</h2>
              {resumes.length > 3 && (
                <Button variant="ghost" size="sm" className="min-h-[36px]" onClick={() => navigate('resumes')}>
                  View all <Files className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
            {loading && !loaded ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <Card key={i} className="h-40 animate-pulse bg-muted/40" />
                ))}
              </div>
            ) : resumes.length === 0 ? (
              <EmptyResumes onCreate={() => setCreateOpen(true)} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {resumes.slice(0, 4).map((r) => (
                  <ResumeCard key={r.id} resume={r} onView={(res) => setViewTarget(res.id)} onDelete={setDeleteTarget} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {section === 'resumes' && (
        <div className="mt-2">
          {loading && !loaded ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="h-40 animate-pulse bg-muted/40" />
              ))}
            </div>
          ) : resumes.length === 0 ? (
            <EmptyResumes onCreate={() => setCreateOpen(true)} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resumes.map((r) => (
                <ResumeCard key={r.id} resume={r} onView={(res) => setViewTarget(res.id)} onDelete={setDeleteTarget} />
              ))}
            </div>
          )}
        </div>
      )}

      <NewResumeDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ViewResumeDialog resumeId={viewTarget} open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this resume along with its saved versions and analyses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
            >
              {deleting ? 'Deleting…' : 'Delete resume'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function EmptyResumes({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-300">
          <FolderOpen className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <p className="font-semibold">You haven&apos;t created a resume yet.</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Start from scratch, upload an existing resume to recreate it with AI, or explore with sample data.
          </p>
        </div>
        <Button onClick={onCreate} className="min-h-[44px]">
          <Sparkles className="h-4 w-4" aria-hidden /> Create Your First Resume
        </Button>
      </CardContent>
    </Card>
  );
}
