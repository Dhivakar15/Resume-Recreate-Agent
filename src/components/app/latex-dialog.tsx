'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiFetch, downloadFile } from '@/lib/client/api';
import { LoadingButton } from '@/components/app/loading-button';
import { Check, Code2, Copy, Download } from 'lucide-react';

/** View / copy / download the ATS-friendly LaTeX source for a resume. */
export function LatexDialog({
  resumeId,
  open,
  onOpenChange,
}: {
  resumeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-teal-600" aria-hidden /> LaTeX Resume
          </DialogTitle>
          <DialogDescription>
            Clean, ATS-friendly LaTeX (article class). Compile with pdflatex or paste into Overleaf.
          </DialogDescription>
        </DialogHeader>
        {open && resumeId ? <LatexContent resumeId={resumeId} /> : null}
      </DialogContent>
    </Dialog>
  );
}

/** Inner component so a fresh fetch (and loading state) starts each time the dialog opens. */
function LatexContent({ resumeId }: { resumeId: string }) {
  const [tex, setTex] = useState('');
  const [fileName, setFileName] = useState('resume.tex');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ tex: string; fileName: string }>(`/api/resumes/${resumeId}/latex?inline=1`)
      .then((data) => {
        if (cancelled) return;
        setTex(data.tex);
        setFileName(data.fileName);
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
  }, [resumeId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tex);
      setCopied(true);
      toast.success('LaTeX code copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy automatically. Select the code and copy manually.');
    }
  };

  if (loading) {
    return <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">Generating LaTeX…</div>;
  }

  return (
    <>
      <pre
        className="max-h-96 overflow-y-auto rounded-lg bg-neutral-950 p-4 text-[11px] leading-relaxed text-neutral-200"
        aria-label="LaTeX source code"
      >
        <code>{tex}</code>
      </pre>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={copy} disabled={!tex}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? 'Copied' : 'Copy LaTeX'}
        </Button>
        <LoadingButton
          onClick={() => {
            downloadFile(`/api/resumes/${resumeId}/latex`, fileName).catch((e: Error) => toast.error(e.message));
          }}
          disabled={!tex}
        >
          <Download className="h-4 w-4" aria-hidden /> Download .tex
        </LoadingButton>
      </div>
    </>
  );
}
