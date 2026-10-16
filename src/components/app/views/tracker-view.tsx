'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { apiFetch } from '@/lib/client/api';
import { Float3D, Rise3D, Tilt3D } from '@/components/app/three-d/motion';
import { LoadingButton } from '@/components/app/loading-button';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  BriefcaseBusiness,
  CalendarClock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types & constants ───────────────────────────────────────────────────────

type ApplicationStatus = 'Applied' | 'Shortlisted' | 'Interview' | 'Selected' | 'Rejected';

const STATUSES: ApplicationStatus[] = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

const STATUS_DOT: Record<ApplicationStatus, string> = {
  Applied: 'bg-cyan-400',
  Shortlisted: 'bg-violet-400',
  Interview: 'bg-amber-400',
  Selected: 'bg-emerald-400',
  Rejected: 'bg-rose-400',
};

const STATUS_HEX: Record<ApplicationStatus, string> = {
  Applied: '#22d3ee',
  Shortlisted: '#8b5cf6',
  Interview: '#f59e0b',
  Selected: '#34d399',
  Rejected: '#fb7185',
};

interface Application {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedDate: string | null;
  interviewDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const GLASS = 'border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';

const formatDate = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
};

/** yyyy-mm-dd (date input value) → ISO, kept at local noon so the day never shifts across timezones. */
const toIso = (value: string): string => (value ? new Date(`${value}T12:00:00`).toISOString() : '');

const isoToInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

// ─── Create / edit dialog ────────────────────────────────────────────────────

interface ApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Application | null;
  onSaved: (application: Application, wasEdit: boolean) => void;
}

function ApplicationDialog({ open, onOpenChange, initial, onSaved }: ApplicationDialogProps) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('Applied');
  const [appliedDate, setAppliedDate] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ company?: string; role?: string }>({});
  const [saving, setSaving] = useState(false);

  // Prefill whenever the dialog opens (create vs edit).
  useEffect(() => {
    if (!open) return;
    setCompany(initial?.company ?? '');
    setRole(initial?.role ?? '');
    setStatus(initial?.status ?? 'Applied');
    setAppliedDate(isoToInput(initial?.appliedDate ?? null));
    setInterviewDate(isoToInput(initial?.interviewDate ?? null));
    setNotes(initial?.notes ?? '');
    setErrors({});
    setSaving(false);
  }, [open, initial]);

  const submit = async () => {
    const next: { company?: string; role?: string } = {};
    if (!company.trim()) next.company = 'Company is required.';
    if (!role.trim()) next.role = 'Role is required.';
    setErrors(next);
    if (next.company || next.role) return;

    setSaving(true);
    try {
      const payload = {
        company: company.trim(),
        role: role.trim(),
        status,
        appliedDate: appliedDate ? toIso(appliedDate) : '',
        interviewDate: interviewDate ? toIso(interviewDate) : '',
        notes: notes.trim(),
      };
      const data = initial
        ? await apiFetch<{ application: Application }>(`/api/applications/${initial.id}`, { method: 'PUT', json: payload })
        : await apiFetch<{ application: Application }>('/api/applications', { method: 'POST', json: payload });
      toast.success(initial ? 'Application updated.' : 'Application added to your tracker.');
      onSaved(data.application, !!initial);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.08] bg-[#0a0e1f] text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100">{initial ? 'Edit application' : 'Add application'}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {initial ? 'Update the details of this tracked application.' : 'Track a role you applied for and follow it through your pipeline.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="app-company" className="text-slate-300">
              Company <span className="text-fuchsia-400" aria-hidden>*</span>
            </Label>
            <Input
              id="app-company"
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                if (errors.company) setErrors((p) => ({ ...p, company: undefined }));
              }}
              placeholder="Acme Corp"
              maxLength={80}
              className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600"
              aria-invalid={!!errors.company}
            />
            {errors.company && <p className="text-xs text-rose-400">{errors.company}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="app-role" className="text-slate-300">
              Role <span className="text-fuchsia-400" aria-hidden>*</span>
            </Label>
            <Input
              id="app-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (errors.role) setErrors((p) => ({ ...p, role: undefined }));
              }}
              placeholder="Senior Frontend Engineer"
              maxLength={100}
              className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600"
              aria-invalid={!!errors.role}
            />
            {errors.role && <p className="text-xs text-rose-400">{errors.role}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label className="text-slate-300">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
                <SelectTrigger className="w-full border-white/10 bg-white/[0.04] text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/[0.08] bg-[#0a0e1f] text-slate-200">
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="focus:bg-white/[0.06] focus:text-white">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="app-applied" className="text-slate-300">
                Applied date
              </Label>
              <Input
                id="app-applied"
                type="date"
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
                className="border-white/10 bg-white/[0.04] text-slate-100 [color-scheme:dark]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="app-interview" className="text-slate-300">
                Interview date
              </Label>
              <Input
                id="app-interview"
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="border-white/10 bg-white/[0.04] text-slate-100 [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="app-notes" className="text-slate-300">
              Notes
            </Label>
            <Textarea
              id="app-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referral from Dana, recruiter call Friday…"
              rows={3}
              maxLength={1000}
              className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <LoadingButton
            loading={saving}
            loadingText={initial ? 'Saving…' : 'Adding…'}
            onClick={submit}
            className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
          >
            {initial ? 'Save changes' : 'Add application'}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Board card ──────────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  app: Application;
  onEdit: (app: Application) => void;
  onDelete: (app: Application) => void;
  onStatusChange: (app: Application, status: ApplicationStatus) => void;
}) {
  const applied = formatDate(app.appliedDate);
  const interview = formatDate(app.interviewDate);

  return (
    <Tilt3D max={3}>
      <Card className={cn(GLASS, 'min-w-0 transition-shadow hover:shadow-[0_10px_40px_-12px_rgba(139,92,246,0.35)]')}>
        <CardContent className="space-y-2.5 p-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100" title={app.role}>
              {app.role}
            </p>
            <p className="truncate text-xs text-slate-400" title={app.company}>
              @ {app.company}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {applied && <span>Applied {applied}</span>}
            {interview && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                <CalendarClock className="h-3 w-3" aria-hidden /> Interview {interview}
              </span>
            )}
          </div>

          {app.notes && (
            <p className="truncate text-xs text-slate-500" title={app.notes}>
              {app.notes}
            </p>
          )}

          <div className="flex items-center gap-1.5 border-t border-white/[0.05] pt-2.5">
            <Select value={app.status} onValueChange={(v) => onStatusChange(app, v as ApplicationStatus)}>
              <SelectTrigger
                size="sm"
                aria-label={`Status for ${app.role} @ ${app.company}`}
                className="h-8 min-h-[36px] w-[116px] shrink-0 border-white/10 bg-white/[0.04] text-xs text-slate-200 hover:bg-white/[0.08]"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[app.status])} aria-hidden />
                  <span className="truncate">{app.status}</span>
                </span>
              </SelectTrigger>
              <SelectContent className="border-white/[0.08] bg-[#0a0e1f] text-slate-200">
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="focus:bg-white/[0.06] focus:text-white">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${app.role} @ ${app.company}`}
                className="min-h-[36px] min-w-[36px] text-slate-400 hover:bg-white/[0.06] hover:text-white"
                onClick={() => onEdit(app)}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${app.role} @ ${app.company}`}
                className="min-h-[36px] min-w-[36px] text-slate-400 hover:bg-white/[0.06] hover:text-red-400"
                onClick={() => onDelete(app)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Tilt3D>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function TrackerView() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ applications: Application[] }>('/api/applications');
      setApplications(data.applications);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
    for (const app of applications) map[app.status] = (map[app.status] ?? 0) + 1;
    return map;
  }, [applications]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (app: Application) => {
    setEditing(app);
    setDialogOpen(true);
  };

  const onSaved = (application: Application, wasEdit: boolean) => {
    setApplications((prev) => (wasEdit ? prev.map((a) => (a.id === application.id ? application : a)) : [application, ...prev]));
  };

  // Optimistic status change — revert on failure.
  const changeStatus = async (app: Application, status: ApplicationStatus) => {
    if (app.status === status) return;
    setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a)));
    try {
      const data = await apiFetch<{ application: Application }>(`/api/applications/${app.id}`, {
        method: 'PUT',
        json: { status },
      });
      setApplications((prev) => prev.map((a) => (a.id === data.application.id ? data.application : a)));
      toast.success(`Moved to ${status}.`);
    } catch (e) {
      setApplications((prev) => prev.map((a) => (a.id === app.id ? app : a)));
      toast.error((e as Error).message);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch<{ success: boolean }>(`/api/applications/${deleteTarget.id}`, { method: 'DELETE' });
      setApplications((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success('Application deleted.');
      setDeleteTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell active="tracker">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Application Tracker</h1>
          <p className="mt-1 text-sm text-slate-400">Follow every application from first send to final decision.</p>
        </div>
        <Button
          onClick={openCreate}
          className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_24px_-6px_rgba(139,92,246,0.6)] hover:from-violet-500 hover:to-fuchsia-500"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add application
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Card key={i} className={cn('h-20 animate-pulse', GLASS)} />
            ))}
          </div>
          <Card className={cn('h-72 animate-pulse', GLASS)} />
        </div>
      ) : error ? (
        <Card className={cn(GLASS, 'border-red-400/20')}>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]" onClick={load}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STATUSES.map((status, i) => (
              <Rise3D key={status} delay={i * 0.05}>
                <Card className={GLASS}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[status])} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-xl font-bold leading-none text-white">{counts[status]}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{status}</p>
                    </div>
                  </CardContent>
                </Card>
              </Rise3D>
            ))}
          </div>

          {/* Board */}
          {applications.length === 0 ? (
            <Card className={cn('mt-6 border-dashed border-white/[0.12]', GLASS)}>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                <Float3D duration={5}>
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300 shadow-[0_0_30px_-8px_rgba(139,92,246,0.6)]">
                    <BriefcaseBusiness className="h-7 w-7" aria-hidden />
                  </span>
                </Float3D>
                <div>
                  <p className="font-semibold text-slate-100">Track your first application</p>
                  <p className="mt-1 max-w-sm text-sm text-slate-400">
                    Add the roles you applied for and watch them move through Applied, Interview and beyond.
                  </p>
                </div>
                <Button
                  onClick={openCreate}
                  className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
                >
                  <Plus className="h-4 w-4" aria-hidden /> Add application
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-6 overflow-x-auto pb-2 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin] lg:overflow-visible lg:pb-0">
              <div className="grid min-w-[980px] gap-4 lg:min-w-0 lg:grid-cols-5">
                {STATUSES.map((status, ci) => (
                  <Rise3D key={status} delay={ci * 0.04} className="min-w-0">
                    <section className="flex min-w-0 flex-col rounded-xl border border-white/[0.05] bg-white/[0.02] p-3" aria-label={`${status} column, ${counts[status]} applications`}>
                      <header className="mb-3 flex items-center gap-2 px-1">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[status])} aria-hidden />
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">{status}</h2>
                        <span
                          className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: `${STATUS_HEX[status]}1f`, color: STATUS_HEX[status] }}
                        >
                          {counts[status]}
                        </span>
                      </header>
                      <div className="flex flex-col gap-3">
                        {applications
                          .filter((a) => a.status === status)
                          .map((app) => (
                            <ApplicationCard key={app.id} app={app} onEdit={openEdit} onDelete={setDeleteTarget} onStatusChange={changeStatus} />
                          ))}
                        {counts[status] === 0 && (
                          <p className="rounded-lg border border-dashed border-white/[0.08] px-3 py-4 text-center text-xs text-slate-600">Nothing here yet</p>
                        )}
                      </div>
                    </section>
                  </Rise3D>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ApplicationDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSaved={onSaved} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-white/[0.08] bg-[#0a0e1f]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete this application?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {deleteTarget ? `${deleteTarget.role} @ ${deleteTarget.company}` : ''} will be removed from your tracker. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
            >
              {deleting ? 'Deleting…' : 'Delete application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
