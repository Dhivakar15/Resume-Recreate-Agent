'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/app/loading-button';
import { ResumePreview } from '@/components/resume/resume-preview';
import { LatexDialog } from '@/components/app/latex-dialog';
import { apiFetch, downloadFile } from '@/lib/client/api';
import { TEMPLATE_LABELS, normalizeResumeData, type ResumeData, type ResumeTemplate } from '@/types/resume';
import { Download, Code2 } from 'lucide-react';

/** Read-only resume viewer with template switching, PDF download and LaTeX generation. */
export function ViewResumeDialog({
  resumeId,
  open,
  onOpenChange,
}: {
  resumeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<ResumeData | null>(null);
  const [template, setTemplate] = useState<ResumeTemplate>('modern');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [latexOpen, setLatexOpen] = useState(false);

  useEffect(() => {
    if (!open || !resumeId) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    apiFetch<{ resume: { title: string; template: ResumeTemplate }; data: unknown }>(`/api/resumes/${resumeId}`)
      .then((res) => {
        if (cancelled) return;
        setData(normalizeResumeData(res.data));
        setTemplate(res.resume.template);
        setTitle(res.resume.title);
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, resumeId]);

  const downloadPdf = async () => {
    if (!resumeId) return;
    setPdfBusy(true);
    try {
      await downloadFile(`/api/resumes/${resumeId}/pdf`, `${title || 'resume'}.pdf`);
      toast.success('PDF downloaded.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title || 'Resume Preview'}</DialogTitle>
            <DialogDescription>Read-only preview. Switch templates or export — your saved template stays unchanged.</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">Loading resume…</div>
          ) : data ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="view-template">Preview template</Label>
                  <Select value={template} onValueChange={(v) => setTemplate(v as ResumeTemplate)}>
                    <SelectTrigger id="view-template" className="w-44">
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
                </div>
                <div className="ml-auto flex gap-2">
                  <LoadingButton variant="outline" loading={false} onClick={() => setLatexOpen(true)} disabled={!data}>
                    <Code2 className="h-4 w-4" aria-hidden /> Generate LaTeX
                  </LoadingButton>
                  <LoadingButton loading={pdfBusy} loadingText="Creating PDF…" onClick={downloadPdf} disabled={!data}>
                    <Download className="h-4 w-4" aria-hidden /> Download PDF
                  </LoadingButton>
                </div>
              </div>
              <ResumePreview data={data} template={template} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      {resumeId && <LatexDialog resumeId={resumeId} open={latexOpen} onOpenChange={setLatexOpen} />}
    </>
  );
}
