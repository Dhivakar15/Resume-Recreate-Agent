'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** One repeatable entry (education row, project, …) with a remove action. */
export function EntryCard({
  title,
  index,
  onRemove,
  canRemove = true,
  actions,
  children,
}: {
  title: string;
  index: number;
  onRemove?: () => void;
  canRemove?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <GripVertical className="h-4 w-4 opacity-40" aria-hidden />
          {title} {index + 1}
        </p>
        <div className="flex items-center gap-1.5">
          {actions}
          {canRemove && onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[36px] text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Remove
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-3">{children}</div>
    </Card>
  );
}

export function AddEntryButton({ label, onClick, maxed }: { label: string; onClick: () => void; maxed?: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full min-h-[44px] border-dashed"
      onClick={onClick}
      disabled={maxed}
    >
      <Plus className="h-4 w-4" aria-hidden /> {label}
    </Button>
  );
}

export function TextInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} />;
}

/** Multi-line field where each line becomes a resume bullet point. */
export function BulletTextarea(props: React.ComponentProps<typeof Textarea>) {
  return (
    <div>
      <Textarea {...props} />
      <p className="mt-1 text-xs text-muted-foreground">One bullet point per line.</p>
    </div>
  );
}
