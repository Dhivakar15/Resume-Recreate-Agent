'use client';

import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sparkles, User } from 'lucide-react';

interface AiReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  original: string;
  improved: string;
  onAccept: (text: string) => void;
}

/**
 * Shows the AI's rewrite next to the original so the user can accept or reject it.
 * Nothing touches the form until the user accepts.
 */
export function AiReviewDialog({ open, onOpenChange, title, description, original, improved, onAccept }: AiReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-600" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description ?? 'Review the AI-improved version. Your original text is kept until you accept.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <User className="h-3.5 w-3.5" aria-hidden /> Your text
            </div>
            <p className="max-h-56 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">{original}</p>
          </div>
          <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-3 dark:border-teal-900 dark:bg-teal-950/30">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> <Badge variant="secondary" className="h-5 bg-teal-100 text-[10px] text-teal-800 dark:bg-teal-900 dark:text-teal-200">AI Improved</Badge>
            </div>
            <p className="max-h-56 overflow-y-auto whitespace-pre-wrap text-sm">{improved}</p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep mine
          </Button>
          <Button
            onClick={() => {
              onAccept(improved);
              onOpenChange(false);
              toast.success('Applied the AI-improved text.');
            }}
          >
            Use AI version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
