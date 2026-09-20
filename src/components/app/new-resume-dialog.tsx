'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingButton } from '@/components/app/loading-button';
import { apiFetch } from '@/lib/client/api';
import { useResumesStore } from '@/stores/resumes-store';
import { DEMO_RESUME_DATA, DEMO_NOTE } from '@/lib/demo-data';
import { emptyResumeData } from '@/types/resume';
import { navigate } from '@/lib/client/navigation';
import { FilePlus2, Sparkles, Upload, Loader2, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'blank' | 'upload' | 'demo';

/** Create-resume dialog: start blank, upload an existing PDF/DOCX for AI recreation, or load sample data. */
export function NewResumeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>('blank');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [recreating, setRecreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createResume = useResumesStore((s) => s.create);

  const reset = () => {
    setMode('blank');
    setTitle('');
    setCreating(false);
    setFile(null);
    setExtracting(false);
    setExtractedText('');
    setRecreating(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const close = () => {
    onOpenChange(false);
    reset();
  };

  const createBlank = async () => {
    setCreating(true);
    try {
      const resume = await createResume({
        title: title.trim() || 'Untitled Resume',
        data: emptyResumeData(),
      });
      close();
      navigate('builder', resume.id);
    } catch (e) {
      toast.error((e as Error).message);
      setCreating(false);
    }
  };

  const createDemo = async () => {
    setCreating(true);
    try {
      const resume = await createResume({
        title: title.trim() || 'Sample — Software Developer',
        data: structuredClone(DEMO_RESUME_DATA),
      });
      toast.info(DEMO_NOTE, { duration: 6000 });
      close();
      navigate('builder', resume.id);
    } catch (e) {
      toast.error((e as Error).message);
      setCreating(false);
    }
  };

  const validateFile = (f: File): boolean => {
    const okType = f.type === 'application/pdf' || f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.(pdf|docx)$/i.test(f.name);
    if (!okType) {
      toast.error('Unsupported file type. Please upload a PDF or DOCX file.');
      return false;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('File is too large. Maximum allowed size is 5 MB.');
      return false;
    }
    return true;
  };

  const extractText = async (f: File) => {
    setExtracting(true);
    setExtractedText('');
    try {
      const form = new FormData();
      form.append('file', f);
      const data = await apiFetch<{ text: string; fileName: string; characters: number }>('/api/upload', {
        method: 'POST',
        body: form,
      });
      setExtractedText(data.text);
      if (!title.trim()) setTitle(data.fileName.replace(/\.(pdf|docx)$/i, '').slice(0, 60));
      toast.success(`Extracted ${data.characters.toLocaleString()} characters from ${data.fileName}.`);
    } catch (e) {
      toast.error((e as Error).message);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setExtracting(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!validateFile(f)) return;
    setFile(f);
    extractText(f);
  };

  const recreateWithAI = async () => {
    setRecreating(true);
    try {
      const { data } = await apiFetch<{ data: typeof DEMO_RESUME_DATA }>('/api/ai/recreate', {
        method: 'POST',
        json: { rawText: extractedText },
      });
      const resume = await createResume({
        title: title.trim() || 'Recreated Resume',
        data,
      });
      toast.success('Resume recreated with AI. Review the details in the builder.');
      close();
      navigate('builder', resume.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRecreating(false);
    }
  };

  const modes: { key: Mode; label: string; icon: React.ReactNode }[] = [
    { key: 'blank', label: 'Start from scratch', icon: <FilePlus2 className="h-4 w-4" aria-hidden /> },
    { key: 'upload', label: 'Upload existing resume', icon: <Upload className="h-4 w-4" aria-hidden /> },
    { key: 'demo', label: 'Try sample data', icon: <Sparkles className="h-4 w-4" aria-hidden /> },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Resume</DialogTitle>
          <DialogDescription>Start fresh, recreate an existing resume with AI, or explore with sample data.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={cn(
                'flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                mode === m.key
                  ? 'border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200'
                  : 'border-input bg-background hover:bg-muted',
              )}
              aria-pressed={mode === m.key}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="resume-title">Resume name</Label>
            <Input
              id="resume-title"
              placeholder="e.g. Software Developer Resume"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
          </div>

          {mode === 'blank' && (
            <div className="flex justify-end">
              <LoadingButton loading={creating} loadingText="Creating…" onClick={createBlank}>
                Create & open builder
              </LoadingButton>
            </div>
          )}

          {mode === 'demo' && (
            <div className="space-y-3">
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <FileWarning className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                {DEMO_NOTE}
              </p>
              <div className="flex justify-end">
                <LoadingButton loading={creating} loadingText="Creating…" onClick={createDemo} variant="secondary">
                  Load sample data
                </LoadingButton>
              </div>
            </div>
          )}

          {mode === 'upload' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="resume-file">Existing resume (PDF or DOCX, max 5 MB)</Label>
                <Input
                  id="resume-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={onFileChange}
                  disabled={extracting || recreating}
                />
              </div>

              {extracting && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Extracting text from your file…
                </p>
              )}

              {extractedText && (
                <div className="space-y-2">
                  <Label>Extracted content (review before recreating)</Label>
                  <ScrollArea className="h-40 rounded-md border bg-muted/30">
                    <p className="whitespace-pre-wrap p-3 text-xs leading-relaxed text-muted-foreground">{extractedText}</p>
                  </ScrollArea>
                  <div className="flex justify-end">
                    <LoadingButton
                      loading={recreating}
                      loadingText="Recreating your resume…"
                      onClick={recreateWithAI}
                    >
                      <Sparkles className="h-4 w-4" aria-hidden /> Recreate Resume with AI
                    </LoadingButton>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
