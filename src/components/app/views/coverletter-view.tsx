'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app/app-shell';
import { LoadingButton } from '@/components/app/loading-button';
import { Float3D, Rise3D } from '@/components/app/three-d/motion';
import { apiFetch } from '@/lib/client/api';
import { navigate } from '@/lib/client/navigation';
import { useResumesStore } from '@/stores/resumes-store';
import { COVER_LETTER_TONES, type CoverLetterTone, type SavedCoverLetter } from '@/types/ai-tools';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, FilePlus2, FileText, Loader2, MailOpen, RefreshCw, Save, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Midnight Glass recipes ──────────────────────────────────────────────────

const GLASS = 'border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';
const INPUT_CLS = 'border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600 dark:bg-white/[0.04]';
const OUTLINE_BTN = 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white min-h-[44px]';
const PRIMARY_BTN =
  'min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500';

interface GenerationResult {
  letter: string;
  wordCount: number;
  tone: CoverLetterTone;
  resumeTitle: string;
}

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

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

const TONE_BADGE: Record<string, string> = {
  professional: 'border-violet-400/30 bg-violet-500/15 text-violet-200',
  formal: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
  short: 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300',
};

/** AI Cover Letter Generator: compose, edit, save and reuse tailored letters. */
export function CoverLetterView() {
  const resumes = useResumesStore((s) => s.resumes);
  const resumesLoaded = useResumesStore((s) => s.loaded);
  const loadingResumes = useResumesStore((s) => s.loading);
  const fetchResumes = useResumesStore((s) => s.fetch);

  // Form
  const [resumeId, setResumeId] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState<CoverLetterTone>('professional');
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Generation + result panel
  const [generating, setGenerating] = useState(false);
  const [letterContent, setLetterContent] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null); // content when opened from a saved letter
  const [saving, setSaving] = useState(false);

  // Saved letters
  const [letters, setLetters] = useState<SavedCoverLetter[]>([]);
  const [lettersLoading, setLettersLoading] = useState(true);
  const [lettersError, setLettersError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedCoverLetter | null>(null);
  const [deleting, setDeleting] = useState(false);

  const bootedRef = useRef(false);

  const loadLetters = useCallback(async () => {
    setLettersLoading(true);
    setLettersError(null);
    try {
      const data = await apiFetch<{ letters: SavedCoverLetter[] }>('/api/cover-letters');
      setLetters(data.letters);
    } catch (e) {
      setLettersError((e as Error).message);
    } finally {
      setLettersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    fetchResumes(!useResumesStore.getState().loaded).catch((e: unknown) => toast.error((e as Error).message));
    void loadLetters();
  }, [fetchResumes, loadLetters]);

  const noResumes = resumesLoaded && resumes.length === 0;
  const selectedResume = resumes.find((r) => r.id === resumeId) ?? null;
  const hasResult = letterContent.trim().length > 0;

  const runGenerate = useCallback(async () => {
    if (generating || !selectedResume) return;
    const cErr = !company.trim() ? 'Company name is required.' : null;
    const rErr = !role.trim() ? 'Job role is required.' : null;
    setCompanyError(cErr);
    setRoleError(rErr);
    if (cErr || rErr) return;
    setGenerating(true);
    try {
      const result = await apiFetch<GenerationResult>('/api/ai/cover-letter', {
        method: 'POST',
        json: {
          resumeId: selectedResume.id,
          company: company.trim(),
          role: role.trim(),
          jobDescription: jobDescription.trim() || undefined,
          tone,
        },
      });
      setLetterContent(result.letter);
      setSavedId(null);
      setBaseline(null);
      toast.success(`Cover letter ready — ${result.wordCount} words.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }, [company, generating, jobDescription, role, selectedResume, tone]);

  const saveLetter = async () => {
    if (saving || !selectedResume || !hasResult) return;
    if (savedId && baseline !== null && letterContent === baseline) {
      toast.info('No changes since the last save.');
      return;
    }
    setSaving(true);
    try {
      if (savedId && baseline !== null) {
        // Content of an opened saved letter was edited → update in place.
        const { letter } = await apiFetch<{ letter: SavedCoverLetter }>(`/api/cover-letters/${savedId}`, {
          method: 'PUT',
          json: { content: letterContent },
        });
        setBaseline(letterContent);
        setLetters((ls) => ls.map((l) => (l.id === letter.id ? { ...l, content: letter.content, updatedAt: letter.updatedAt } : l)));
        toast.success('Updates saved to the existing letter.');
      } else {
        const { letter } = await apiFetch<{ letter: SavedCoverLetter }>('/api/cover-letters', {
          method: 'POST',
          json: { resumeId: selectedResume.id, company: company.trim(), role: role.trim(), tone, content: letterContent },
        });
        setLetters((ls) => [letter, ...ls]);
        setSavedId(letter.id);
        setBaseline(letterContent);
        toast.success('Cover letter saved.');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const copyLetter = async () => {
    try {
      await navigator.clipboard.writeText(letterContent);
      toast.success('Copied to clipboard.');
    } catch {
      toast.error('Could not copy — please select the text and copy manually.');
    }
  };

  const downloadLetter = () => {
    const blob = new Blob([letterContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${(company.trim() || 'draft').replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as .txt.');
  };

  const openLetter = (l: SavedCoverLetter) => {
    setCompany(l.company);
    setRole(l.role);
    const letterTone = COVER_LETTER_TONES.find((t) => t.key === l.tone);
    if (letterTone) setTone(letterTone.key);
    if (l.resumeId && resumes.some((r) => r.id === l.resumeId)) setResumeId(l.resumeId);
    setLetterContent(l.content);
    setSavedId(l.id);
    setBaseline(l.content);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await apiFetch<{ success: boolean }>(`/api/cover-letters/${deleteTarget.id}`, { method: 'DELETE' });
      setLetters((ls) => ls.filter((l) => l.id !== deleteTarget.id));
      if (savedId === deleteTarget.id) {
        setSavedId(null);
        setBaseline(null);
      }
      toast.success('Cover letter deleted.');
      setDeleteTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell active="coverletter">
      <div className="space-y-6">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30"
            aria-hidden
          >
            <MailOpen className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white">AI Cover Letter Generator</h1>
            <p className="text-sm text-slate-400">
              Compose a tailored cover letter for any company and role, then edit, save and reuse it.
            </p>
          </div>
        </header>

        {noResumes ? (
          /* Empty state: no resumes to generate from */
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
                  Cover letters are generated from your resume. Create one first, then come back to tailor a letter in
                  seconds.
                </p>
              </div>
              <Button className={PRIMARY_BTN} onClick={() => navigate('resumes')}>
                <FilePlus2 className="h-4 w-4" aria-hidden /> Create Your First Resume
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* ── LEFT: Generate form ── */}
              <Rise3D className="h-full">
                <Card className={cn(GLASS, 'h-full')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                      <Wand2 className="h-4 w-4 text-violet-300" aria-hidden /> Generate
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                      Pick a resume, name the company and role, and the AI writes the letter.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="coverletter-resume" className="text-slate-300">
                        Resume
                      </Label>
                      <Select value={resumeId || undefined} onValueChange={setResumeId} disabled={generating || loadingResumes}>
                        <SelectTrigger
                          id="coverletter-resume"
                          className={cn('min-h-[44px] w-full border-white/10 text-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]')}
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="coverletter-company" className="text-slate-300">
                          Company <span className="text-fuchsia-400" aria-hidden>*</span>
                        </Label>
                        <Input
                          id="coverletter-company"
                          placeholder="e.g. Acme Corp"
                          value={company}
                          maxLength={120}
                          disabled={generating}
                          aria-invalid={companyError ? true : undefined}
                          className={INPUT_CLS}
                          onChange={(e) => {
                            setCompany(e.target.value);
                            if (companyError && e.target.value.trim()) setCompanyError(null);
                          }}
                        />
                        {companyError && <p className="text-xs text-rose-400">{companyError}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="coverletter-role" className="text-slate-300">
                          Job role <span className="text-fuchsia-400" aria-hidden>*</span>
                        </Label>
                        <Input
                          id="coverletter-role"
                          placeholder="e.g. Frontend Developer"
                          value={role}
                          maxLength={120}
                          disabled={generating}
                          aria-invalid={roleError ? true : undefined}
                          className={INPUT_CLS}
                          onChange={(e) => {
                            setRole(e.target.value);
                            if (roleError && e.target.value.trim()) setRoleError(null);
                          }}
                        />
                        {roleError && <p className="text-xs text-rose-400">{roleError}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="coverletter-jd" className="text-slate-300">
                        Job description <span className="text-slate-500">(optional)</span>
                      </Label>
                      <Textarea
                        id="coverletter-jd"
                        rows={5}
                        maxLength={15000}
                        placeholder="Paste the job description for extra tailoring (optional)"
                        value={jobDescription}
                        disabled={generating}
                        className={cn(INPUT_CLS, 'min-h-[110px] resize-y')}
                        onChange={(e) => setJobDescription(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-300">Tone</Label>
                      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Letter tone">
                        {COVER_LETTER_TONES.map((t) => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => setTone(t.key)}
                            aria-pressed={tone === t.key}
                            disabled={generating}
                            className={cn(
                              'min-h-[44px] rounded-lg border px-2 text-xs font-medium transition-all duration-200 sm:text-sm',
                              tone === t.key
                                ? 'border-violet-400/40 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/20 text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.7)]'
                                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-white',
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1">
                      <LoadingButton
                        loading={generating}
                        loadingText="Composing your letter…"
                        disabled={!selectedResume}
                        onClick={runGenerate}
                        className={cn(PRIMARY_BTN, 'w-full')}
                      >
                        <Sparkles className="h-4 w-4" aria-hidden /> Generate Cover Letter
                      </LoadingButton>
                      {!selectedResume && (
                        <p className="mt-2 text-xs text-slate-500">Choose a resume to enable generation.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Rise3D>

              {/* ── RIGHT: Result ── */}
              <div className="min-w-0" aria-live="polite">
                {generating ? (
                  <Card className={cn(GLASS, 'flex h-full min-h-[420px] flex-col items-center justify-center gap-4 py-12 text-center')}>
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15" aria-hidden>
                      <Loader2 className="h-7 w-7 animate-spin text-violet-300" aria-hidden />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-100">Composing your letter…</p>
                      <p className="animate-pulse text-xs text-slate-500">
                        Reading your resume and tailoring every paragraph — this usually takes 5–15 seconds.
                      </p>
                    </div>
                    <div className="w-full max-w-xs space-y-2 px-6">
                      <Skeleton className="h-3 w-full bg-white/[0.06]" />
                      <Skeleton className="h-3 w-11/12 bg-white/[0.06]" />
                      <Skeleton className="h-3 w-4/5 bg-white/[0.06]" />
                    </div>
                  </Card>
                ) : hasResult ? (
                  <Rise3D distance={18} tilt={5} className="h-full">
                    <Card className={cn(GLASS, 'h-full')}>
                      <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardTitle className="flex items-center gap-2 text-base text-white">
                            <FileText className="h-4 w-4 text-cyan-300" aria-hidden /> Your cover letter
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="border-violet-400/30 bg-violet-500/10 text-violet-200">
                              {wordCount(letterContent)} words
                            </Badge>
                            <Badge variant="outline" className={TONE_BADGE[tone] ?? 'border-white/15 text-slate-300'}>
                              {COVER_LETTER_TONES.find((t) => t.key === tone)?.label ?? tone}
                            </Badge>
                            {savedId && (
                              <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                                Saved
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardDescription className="text-slate-500">
                          Feel free to tweak the text below — then copy, download or save it.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Textarea
                          aria-label="Generated cover letter"
                          value={letterContent}
                          onChange={(e) => setLetterContent(e.target.value)}
                          rows={14}
                          className={cn(INPUT_CLS, 'min-h-[320px] resize-y whitespace-normal leading-relaxed')}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className={OUTLINE_BTN}
                            onClick={runGenerate}
                            disabled={generating || !selectedResume || !company.trim() || !role.trim()}
                          >
                            <RefreshCw className="h-4 w-4" aria-hidden /> Regenerate
                          </Button>
                          <Button variant="outline" className={OUTLINE_BTN} onClick={copyLetter}>
                            <Copy className="h-4 w-4" aria-hidden /> Copy
                          </Button>
                          <LoadingButton
                            loading={saving}
                            loadingText="Saving…"
                            onClick={saveLetter}
                            disabled={!selectedResume}
                            className={PRIMARY_BTN}
                          >
                            <Save className="h-4 w-4" aria-hidden /> {savedId ? 'Update' : 'Save'}
                          </LoadingButton>
                          <Button variant="outline" className={OUTLINE_BTN} onClick={downloadLetter}>
                            <Download className="h-4 w-4" aria-hidden /> Download .txt
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Rise3D>
                ) : (
                  <Card className={cn(GLASS, 'flex h-full min-h-[420px] flex-col items-center justify-center gap-3 border-dashed py-12 text-center')}>
                    <Float3D duration={5} wobble={3}>
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] text-slate-400" aria-hidden>
                        <MailOpen className="h-7 w-7" />
                      </span>
                    </Float3D>
                    <p className="max-w-xs text-sm text-slate-400">
                      Your generated letter will appear here — editable, copyable and ready to save.
                    </p>
                  </Card>
                )}
              </div>
            </div>

            {/* ── Saved letters ── */}
            <Rise3D>
              <Card className={GLASS}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                      <FileText className="h-4 w-4 text-fuchsia-300" aria-hidden /> Saved letters
                    </CardTitle>
                    {letters.length > 0 && (
                      <Badge variant="outline" className="border-white/15 text-slate-400">
                        {letters.length} saved
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-slate-500">
                    Open a letter to load it back into the editor, or remove ones you no longer need.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lettersLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-16 w-full bg-white/[0.06]" />
                      ))}
                    </div>
                  ) : lettersError ? (
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-rose-400/20 bg-rose-400/[0.04] px-4 py-6 text-center">
                      <p className="text-sm text-rose-300">{lettersError}</p>
                      <Button variant="outline" className={OUTLINE_BTN} onClick={() => void loadLetters()}>
                        <RefreshCw className="h-4 w-4" aria-hidden /> Retry
                      </Button>
                    </div>
                  ) : letters.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No saved letters yet — generate one above and hit Save to keep it here.
                    </p>
                  ) : (
                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
                      {letters.map((l) => (
                        <div
                          key={l.id}
                          className={cn(
                            'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.12]',
                            savedId === l.id && 'border-violet-400/30 bg-violet-500/[0.06]',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-100">
                              {l.company} — {l.role}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                              <Badge variant="outline" className={cn('px-1.5 py-0', TONE_BADGE[l.tone] ?? 'border-white/15 text-slate-400')}>
                                {COVER_LETTER_TONES.find((t) => t.key === l.tone)?.label ?? l.tone}
                              </Badge>
                              <span>{timeAgo(l.updatedAt)}</span>
                              <span aria-hidden>·</span>
                              <span>{wordCount(l.content)} words</span>
                              {l.resumeTitle && (
                                <>
                                  <span aria-hidden>·</span>
                                  <span className="truncate">{l.resumeTitle}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" className={cn(OUTLINE_BTN, 'min-h-[44px] px-3 text-xs')} onClick={() => openLetter(l)}>
                              Open
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(OUTLINE_BTN, 'min-h-[44px] px-3 text-rose-300 hover:text-rose-200')}
                              onClick={() => setDeleteTarget(l)}
                              aria-label={`Delete cover letter for ${l.company}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Rise3D>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
              <AlertDialogContent className="border-white/[0.10] bg-[#0a0e1f] text-slate-200">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Delete this cover letter?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    {deleteTarget && `“${deleteTarget.company} — ${deleteTarget.role}” will be permanently removed. This cannot be undone.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    className="border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                    disabled={deleting}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-rose-600 text-white hover:bg-rose-500"
                    disabled={deleting}
                    onClick={() => void confirmDelete()}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden /> {deleting ? 'Deleting…' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </AppShell>
  );
}

