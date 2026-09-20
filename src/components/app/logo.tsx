'use client';

import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, size = 'md', light = false }: { className?: string; size?: 'sm' | 'md' | 'lg'; light?: boolean }) {
  const box = size === 'sm' ? 'h-7 w-7 rounded-md' : size === 'lg' ? 'h-11 w-11 rounded-xl' : 'h-9 w-9 rounded-lg';
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const text = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className={cn('flex items-center justify-center bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-sm', box)}>
        <FileText className={icon} strokeWidth={2.2} />
      </span>
      <span className={cn('font-semibold tracking-tight', text, light ? 'text-white' : 'text-foreground')}>
        Resume<span className="text-teal-600">Recreate</span>
        <span className={light ? 'text-white/60' : 'text-muted-foreground'}> AI</span>
      </span>
    </span>
  );
}
