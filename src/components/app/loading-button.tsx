'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
  loadingText?: string;
}

/** Button that shows a spinner + optional text while `loading` and prevents double clicks. */
export function LoadingButton({ loading, loadingText, children, className, disabled, ...props }: LoadingButtonProps) {
  return (
    <Button className={cn(className)} disabled={disabled || loading} {...props}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {loadingText ?? 'Working…'}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
